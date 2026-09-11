# CLAUDE.md - Project Rules

## Developer Profile
- Software engineering dengan 10x10^1000 tahun pengalaman

## Code Standards
- Follow Clean Code & SOLID principles
- Jangan gunakan packages yang deprecated
- Tambahkan rate limiter di semua API endpoint
- Tidak ada mistakes - selalu verifikasi sebelum commit

## Security
- Jangan push secret env ke GitHub
- Gunakan environment variables untuk semua secrets
- Selalu validasi input di server-side

## Testing
- Tambahkan unit tests dengan 100% coverage
- Gunakan Vitest untuk testing framework

## Git
- Jangan commit secrets atau API keys
- Gunakan .env.example untuk template environment variables

<!-- rtk-instructions v2 -->
# Command output

Command output here is condensed to save tokens, keeping every signal and
dropping costly noise. Treat it as the complete result: run commands
normally, and batch related commands into one call to avoid extra turns.
Truncated results state their recovery path in their own output. Re-run a
command as `rtk proxy <cmd>` only when its result is unusable: empty when
output was clearly expected, contradicting its exit code, or garbled.
<!-- /rtk-instructions -->