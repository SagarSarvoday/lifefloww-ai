"""Pytest configuration and async test runner support."""

import asyncio
import inspect
import pytest


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "asyncio: mark test function to run with asyncio"
    )


def pytest_pyfunc_call(pyfuncitem):
    """Run async test functions using standard library asyncio.run."""
    testfunction = pyfuncitem.obj
    if inspect.iscoroutinefunction(testfunction):
        argnames = pyfuncitem._fixtureinfo.argnames
        kwargs = {arg: pyfuncitem.funcargs[arg] for arg in argnames}
        asyncio.run(testfunction(**kwargs))
        return True
    return None
