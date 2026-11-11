"""BiLSTM with Temporal Attention architecture for sign language recognition.

Designed for high temporal fidelity on isolated sign gestures and fast
in-browser execution via ONNX Runtime Web.
"""
from __future__ import annotations

from typing import Any

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    torch = None  # type: ignore[assignment]
    nn = None     # type: ignore[assignment]
    F = None      # type: ignore[assignment]
    HAS_TORCH = False


if HAS_TORCH:
    class TemporalAttention(nn.Module):
        """Additive temporal attention mechanism.

        Computes attention weights over time steps and produces a context vector:
            u_t = tanh(W * h_t + b)
            alpha_t = softmax(u_t^T * v)
            context = sum(alpha_t * h_t)
        """

        def __init__(self, hidden_dim: int) -> None:
            super().__init__()
            self.projection = nn.Sequential(
                nn.Linear(hidden_dim, hidden_dim // 2),
                nn.Tanh(),
                nn.Linear(hidden_dim // 2, 1, bias=False),
            )

        def forward(self, lstm_outputs: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
            # lstm_outputs: [batch_size, seq_len, hidden_dim]
            scores = self.projection(lstm_outputs)  # [batch_size, seq_len, 1]
            weights = F.softmax(scores, dim=1)  # [batch_size, seq_len, 1]
            context = torch.sum(weights * lstm_outputs, dim=1)  # [batch_size, hidden_dim]
            return context, weights.squeeze(-1)


    class SignBiLSTMAttention(nn.Module):
        """Sign language recognition model using BiLSTM with temporal attention."""

        def __init__(
            self,
            input_dim: int = 222,
            hidden_dim: int = 128,
            lstm_hidden: int = 128,
            num_layers: int = 2,
            num_classes: int = 50,
            dropout: float = 0.3,
        ) -> None:
            super().__init__()
            self.input_dim = input_dim
            self.hidden_dim = hidden_dim
            self.lstm_hidden = lstm_hidden
            self.num_layers = num_layers
            self.num_classes = num_classes

            # Spatial projection
            self.input_proj = nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.LayerNorm(hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
            )

            # Bidirectional LSTM
            self.lstm = nn.LSTM(
                input_size=hidden_dim,
                hidden_size=lstm_hidden,
                num_layers=num_layers,
                batch_first=True,
                bidirectional=True,
                dropout=dropout if num_layers > 1 else 0.0,
            )

            # Attention pooling
            self.attention = TemporalAttention(lstm_hidden * 2)

            # Classification head
            self.classifier = nn.Sequential(
                nn.Dropout(dropout),
                nn.Linear(lstm_hidden * 2, hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout / 2),
                nn.Linear(hidden_dim, num_classes),
            )

        def forward(
            self, x: torch.Tensor, return_attention: bool = False
        ) -> torch.Tensor | tuple[torch.Tensor, torch.Tensor]:
            """Forward pass.

            Args:
                x: Tensor of shape [batch_size, seq_len, input_dim].
                return_attention: Whether to return attention weights.

            Returns:
                logits of shape [batch_size, num_classes] (and optional attention weights).
            """
            projected = self.input_proj(x)
            lstm_out, _ = self.lstm(projected)
            context, attn_weights = self.attention(lstm_out)
            logits = self.classifier(context)

            if return_attention:
                return logits, attn_weights
            return logits

else:
    # Stub classes for environment where torch is not yet installed
    class SignBiLSTMAttention:  # type: ignore[no-redef]
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            raise ImportError("PyTorch (torch) is required. Run in Google Colab with GPU.")
