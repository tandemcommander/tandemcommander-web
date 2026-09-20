"""Build driver for the demo engine."""
import argparse
import pathlib
import subprocess

SOURCES = sorted(pathlib.Path("src").glob("*.cpp"))


def build(release: bool) -> int:
    flags = ["/O2", "/DNDEBUG"] if release else ["/Od", "/Zi"]
    command = ["cl", "/nologo", "/std:c++20", "/EHsc", *flags, *map(str, SOURCES), "/Fe:engine.exe"]
    print(" ".join(command))
    return subprocess.call(command)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release", action="store_true", help="optimised build")
    raise SystemExit(build(parser.parse_args().release))
