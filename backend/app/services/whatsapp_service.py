import httpx
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

async def send_meta_whatsapp_template(
    phone_number_id: str,
    access_token: str,
    to_phone_number: str,
    template_name: str,
    language_code: str,
    template_parameters: List[str]
) -> Dict[str, Any]:
    """
    Dispatches a WhatsApp template notification through the centralized School Meta Cloud API.
    If credentials are mock/unconfigured, simulates a successful delivery with a mock wamid.
    """
    clean_number = to_phone_number.replace("+", "").replace("-", "").replace(" ", "").strip()

    # Check if real Meta credentials are provided
    if not phone_number_id or not access_token or "dummy" in phone_number_id.lower() or "mock" in access_token.lower():
        import time
        mock_wamid = f"wamid.HBgM{int(time.time())}_{clean_number[-4:]}"
        logger.info(f"[Meta Cloud API - Mock Dispatch] Sent '{template_name}' to {clean_number}. ID: {mock_wamid}")
        return {
            "success": True,
            "wamid": mock_wamid,
            "status": "sent",
            "provider": "meta_cloud_api_mock"
        }

    url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_number,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {
                "code": language_code
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": str(param)} for param in template_parameters
                    ]
                }
            ]
        }
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            res_data = response.json()
            if response.status_code in [200, 201]:
                wamid = res_data.get("messages", [{}])[0].get("id")
                return {
                    "success": True,
                    "wamid": wamid,
                    "status": "sent",
                    "provider": "meta_cloud_api"
                }
            else:
                error_info = res_data.get("error", {})
                return {
                    "success": False,
                    "error_code": str(error_info.get("code", response.status_code)),
                    "error_description": error_info.get("message", response.text),
                    "status": "failed",
                    "provider": "meta_cloud_api"
                }
    except Exception as e:
        logger.error(f"WhatsApp Cloud API dispatch error: {e}")
        return {
            "success": False,
            "error_code": "NETWORK_EXCEPTION",
            "error_description": str(e),
            "status": "failed",
            "provider": "meta_cloud_api"
        }

