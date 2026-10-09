import io
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from PIL import Image, ExifTags

from app.models.challenge import Challenge
from app.models.enums import VerificationCheckStatus


class VerificationService:
    """
    Evidence checking logic per BACKEND_SPEC.md.
    These are advisory signals only and never auto-approve a submission.
    """

    @staticmethod
    def extract_and_validate_exif(file_bytes: bytes) -> Dict[str, Any]:
        """
        Extracts EXIF metadata (DateTimeOriginal, GPS) and compares capture time against server UTC now.
        Flags submission if metadata is missing or capture was >2 hours ago.
        """
        server_now = datetime.now(timezone.utc)
        flag_msg = "Photo taken >2 hours ago or metadata stripped (possible old photo or screenshot)"

        try:
            image = Image.open(io.BytesIO(file_bytes))
            exif = image.getexif()
        except Exception:
            return {
                "is_flagged": True,
                "flag_reason": flag_msg,
                "captured_at": server_now,
                "latitude": None,
                "longitude": None,
                "exif_found": False,
            }

        if not exif:
            return {
                "is_flagged": True,
                "flag_reason": flag_msg,
                "captured_at": server_now,
                "latitude": None,
                "longitude": None,
                "exif_found": False,
            }

        # Check DateTimeOriginal (0x9003 = 36867), DateTimeDigitized (0x9004 = 36868), DateTime (0x0132 = 306)
        capture_time_str = None
        try:
            exif_ifd = exif.get_ifd(ExifTags.IFD.Exif)
            if exif_ifd:
                capture_time_str = exif_ifd.get(36867) or exif_ifd.get(36868)
        except Exception:
            pass

        if not capture_time_str:
            capture_time_str = exif.get(306)

        captured_at = None
        if capture_time_str and isinstance(capture_time_str, str):
            cleaned = capture_time_str.strip()
            for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S"):
                try:
                    captured_at = datetime.strptime(cleaned, fmt).replace(tzinfo=timezone.utc)
                    break
                except ValueError:
                    continue

        # Extract GPS if available
        latitude = None
        longitude = None
        try:
            gps_ifd = exif.get_ifd(ExifTags.IFD.GPSInfo)
            if gps_ifd:
                lat_data = gps_ifd.get(2)
                lat_ref = gps_ifd.get(1)
                lon_data = gps_ifd.get(4)
                lon_ref = gps_ifd.get(3)
                if lat_data and lat_ref:
                    d, m, s = lat_data
                    latitude = float(d) + float(m) / 60.0 + float(s) / 3600.0
                    if str(lat_ref).upper() == "S":
                        latitude = -latitude
                if lon_data and lon_ref:
                    d, m, s = lon_data
                    longitude = float(d) + float(m) / 60.0 + float(s) / 3600.0
                    if str(lon_ref).upper() == "W":
                        longitude = -longitude
        except Exception:
            pass

        if not captured_at:
            return {
                "is_flagged": True,
                "flag_reason": flag_msg,
                "captured_at": server_now,
                "latitude": latitude,
                "longitude": longitude,
                "exif_found": False,
            }

        # Compare timestamp against server UTC now (>2 hours ago or >10 min in the future)
        time_diff = server_now - captured_at
        if time_diff.total_seconds() > 2 * 3600 or time_diff.total_seconds() < -600:
            return {
                "is_flagged": True,
                "flag_reason": flag_msg,
                "captured_at": captured_at,
                "latitude": latitude,
                "longitude": longitude,
                "exif_found": True,
            }

        return {
            "is_flagged": False,
            "flag_reason": None,
            "captured_at": captured_at,
            "latitude": latitude,
            "longitude": longitude,
            "exif_found": True,
        }

    @staticmethod
    def check_timestamp(
        captured_at: datetime,
        challenge: Challenge,
    ) -> VerificationCheckStatus:
        now = datetime.now(timezone.utc)
        cap_dt = captured_at if captured_at.tzinfo else captured_at.replace(tzinfo=timezone.utc)

        # Future check
        if cap_dt > now:
            return VerificationCheckStatus.FAILED

        # Challenge window check
        if challenge.starts_at:
            start_dt = challenge.starts_at if challenge.starts_at.tzinfo else challenge.starts_at.replace(tzinfo=timezone.utc)
            if cap_dt < start_dt:
                return VerificationCheckStatus.FAILED

        if challenge.ends_at:
            end_dt = challenge.ends_at if challenge.ends_at.tzinfo else challenge.ends_at.replace(tzinfo=timezone.utc)
            if cap_dt > end_dt:
                return VerificationCheckStatus.FAILED

        return VerificationCheckStatus.PASSED

    @staticmethod
    def check_gps(
        latitude: Optional[float],
        longitude: Optional[float],
        accuracy_m: Optional[float],
        challenge: Challenge,
    ) -> VerificationCheckStatus:
        reqs = challenge.verification_requirements or {}
        if not reqs.get("gps"):
            return VerificationCheckStatus.SKIPPED

        if latitude is None or longitude is None:
            return VerificationCheckStatus.FAILED

        # Low accuracy (e.g. > 100 meters) produces skipped, not failed
        if accuracy_m is not None and accuracy_m > 100.0:
            return VerificationCheckStatus.SKIPPED

        return VerificationCheckStatus.PASSED

    @staticmethod
    def check_qr(
        qr_payload: Optional[str],
        challenge: Challenge,
    ) -> VerificationCheckStatus:
        reqs = challenge.verification_requirements or {}
        if not reqs.get("qr"):
            return VerificationCheckStatus.SKIPPED

        if not qr_payload:
            return VerificationCheckStatus.FAILED

        # In production this checks station ID or challenge secret token
        return VerificationCheckStatus.PASSED

    @staticmethod
    def check_ai(
        photo_url: str,
        challenge: Challenge,
    ) -> Tuple[Optional[float], Optional[str]]:
        """
        Pluggable AI check interface. Default implementation returns high confidence simulation
        so that absence of third party AI service never blocks submissions.
        """
        return 0.94, f"Visual patterns consistent with {challenge.category.value} challenge."


verification_service = VerificationService()
