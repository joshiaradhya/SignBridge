"""Unit tests for SignConnect security, labeling, and WebRTC signaling logic."""

import unittest
from ml.signbridge.schema import SCHEMA_VERSION


def addressed_to_me(user_id: str, payload: dict) -> bool:
    """Mirrors frontend WebRTC addressing logic."""
    sender = payload.get("from")
    recipient = payload.get("to")
    return bool(sender and sender != user_id and (not recipient or recipient == user_id))


def deduplication_key(row_type: str, sender_id: str, payload: dict) -> str:
    """Mirrors frontend signaling deduplication key."""
    candidate = payload.get("candidate", {}).get("candidate", "") if payload.get("candidate") else ""
    sdp_snippet = payload.get("sdp", {}).get("sdp", "")[:30] if payload.get("sdp") else ""
    return f"{row_type}-{sender_id}-{candidate or sdp_snippet}"


class TestConnectSecurityAndSignaling(unittest.TestCase):
    def test_addressing_logic(self):
        user_a = "user-111"
        user_b = "user-222"
        user_c = "user-333"

        # Signal from B to A -> should accept
        self.assertTrue(addressed_to_me(user_a, {"from": user_b, "to": user_a}))

        # Broadcast signal from B without recipient -> should accept
        self.assertTrue(addressed_to_me(user_a, {"from": user_b, "to": None}))

        # Echoed signal from A to A -> must reject
        self.assertFalse(addressed_to_me(user_a, {"from": user_a, "to": user_a}))

        # Signal from B directed to C -> must reject for A
        self.assertFalse(addressed_to_me(user_a, {"from": user_b, "to": user_c}))

    def test_signal_deduplication(self):
        # WebSocket and polling might deliver the exact same offer or ICE candidate
        payload_ice = {"candidate": {"candidate": "candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host"}}
        key1 = deduplication_key("ice", "peer-1", payload_ice)
        key2 = deduplication_key("ice", "peer-1", payload_ice)
        self.assertEqual(key1, key2)

        seen = set()
        seen.add(key1)
        self.assertIn(key2, seen)

        # Different candidate produces different key
        payload_ice2 = {"candidate": {"candidate": "candidate:2 1 UDP 2130706431 192.168.1.2 50001 typ host"}}
        key3 = deduplication_key("ice", "peer-1", payload_ice2)
        self.assertNotEqual(key1, key3)


if __name__ == "__main__":
    unittest.main()
