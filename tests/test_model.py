"""Unit tests for model architecture and export logic."""

import unittest
from ml.signbridge.models.bilstm import HAS_TORCH

if HAS_TORCH:
    import torch
    from ml.signbridge.models.bilstm import SignBiLSTMAttention


class TestModelArchitecture(unittest.TestCase):
    @unittest.skipUnless(HAS_TORCH, "PyTorch required for model tests")
    def test_bilstm_forward_pass(self):
        batch_size = 4
        seq_len = 32
        input_dim = 222
        num_classes = 10

        model = SignBiLSTMAttention(
            input_dim=input_dim,
            hidden_dim=64,
            lstm_hidden=64,
            num_layers=2,
            num_classes=num_classes,
        )
        x = torch.randn(batch_size, seq_len, input_dim)
        logits, weights = model(x, return_attention=True)

        self.assertEqual(logits.shape, (batch_size, num_classes))
        self.assertEqual(weights.shape, (batch_size, seq_len))

        # Check that attention weights sum to 1.0 along the temporal dimension
        sum_weights = weights.sum(dim=1)
        torch.testing.assert_close(sum_weights, torch.ones(batch_size), atol=1e-5, rtol=1e-5)


if __name__ == "__main__":
    unittest.main()
