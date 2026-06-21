"""
Sentry setup and safe capture helpers.

Sentry stays disabled unless SENTRY_DSN is set in the environment.
"""

import os

try:
    import sentry_sdk
except Exception:  # pragma: no cover - lets the app run before deps are installed
    sentry_sdk = None


_SENTRY_ENABLED = False


def init_sentry() -> bool:
    """Initialize Sentry error monitoring if SENTRY_DSN is configured."""
    global _SENTRY_ENABLED

    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        print("⚠️  Sentry disabled: SENTRY_DSN not set")
        return False

    if sentry_sdk is None:
        print("⚠️  Sentry disabled: sentry-sdk is not installed")
        return False

    traces_sample_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "1.0"))
    environment = os.getenv("SENTRY_ENVIRONMENT", "development")

    try:
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=dsn,
            traces_sample_rate=traces_sample_rate,
            environment=environment,
            send_default_pii=False,
            integrations=[
                FastApiIntegration(),
                StarletteIntegration(),
            ]
        )
        _SENTRY_ENABLED = True
        print(f"✅ Sentry error & performance monitoring enabled ({environment})")
        print(f"✅ Tracking API performance (traces sample rate: {traces_sample_rate * 100}%)")
        return True
    except Exception as e:
        print(f"⚠️  Sentry setup error: {e}")
        return False


def capture_exception(error: Exception, **context) -> None:
    """Capture an exception with optional structured context."""
    if not _SENTRY_ENABLED or sentry_sdk is None:
        return

    with sentry_sdk.push_scope() as scope:
        if context:
            scope.set_context("splice_sentinel", context)
        sentry_sdk.capture_exception(error)


def track_operation(operation_name: str, **context):
    """Context manager to track slow operations in Sentry.

    Example:
        with track_operation("fda_query", drug_a="Ibuprofen", drug_b="Amlodipine"):
            result = await check_drug_combination(...)
    """
    if not _SENTRY_ENABLED or sentry_sdk is None:
        from contextlib import contextmanager
        @contextmanager
        def noop():
            yield
        return noop()

    from contextlib import contextmanager

    @contextmanager
    def _track():
        with sentry_sdk.start_span(op=operation_name, name=operation_name, description=f"Running {operation_name}") as span:
            if context:
                for key, value in context.items():
                    span.set_data(key, value)
            yield span

    return _track()
