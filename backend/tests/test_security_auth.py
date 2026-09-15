"""Unit tests for JWT, DPDP masking, and the role x workspace matrix."""

from __future__ import annotations

import pytest

from app.core.exceptions import AuthError, ForbiddenError
from app.core.rbac import WORKSPACE_ROLES, assert_roles, assert_workspace, preferred_role
from app.core.security import (
    create_token,
    decode_token,
    hash_password,
    mask_email,
    scrub_identifier_digits,
    verify_password,
)


def test_password_hash_is_not_reversible() -> None:
    hashed = hash_password("correct-horse")
    assert hashed != "correct-horse"
    assert verify_password("correct-horse", hashed)
    assert not verify_password("wrong-password", hashed)


def test_mask_email_hides_local_part() -> None:
    assert mask_email("citizen@example.gov.in") == "c***@example.gov.in"
    assert mask_email("ab@x.co") == "a***@x.co"
    assert mask_email(None) is None


def test_scrub_strips_long_digit_runs() -> None:
    assert scrub_identifier_digits("name 123412341234 extra") == "name XXXXXXXX extra"
    assert scrub_identifier_digits("pin 123456") == "pin 123456"


def test_jwt_round_trip_and_type_check() -> None:
    token = create_token("11111111-1111-1111-1111-111111111111", token_type="access", roles=["CITIZEN"])
    payload = decode_token(token, expected_type="access")
    assert payload["sub"] == "11111111-1111-1111-1111-111111111111"
    assert payload["roles"] == ["CITIZEN"]
    refresh = create_token("11111111-1111-1111-1111-111111111111", token_type="refresh")
    with pytest.raises(AuthError):
        decode_token(refresh, expected_type="access")


def test_workspace_matrix_matches_contracts() -> None:
    assert WORKSPACE_ROLES["citizen"] == frozenset({"CITIZEN", "STUDENT", "CSC_OPERATOR", "ADMIN"})
    assert WORKSPACE_ROLES["csc"] == frozenset({"CSC_OPERATOR", "ADMIN"})
    assert WORKSPACE_ROLES["welfare"] == frozenset({"WELFARE_OFFICER", "ADMIN"})
    assert preferred_role(["CITIZEN", "CSC_OPERATOR"]) == "CSC_OPERATOR"
    assert_roles(["ADMIN"], "WELFARE_OFFICER")
    with pytest.raises(ForbiddenError):
        assert_roles(["CITIZEN"], "WELFARE_OFFICER")
    with pytest.raises(ForbiddenError):
        assert_workspace(["CITIZEN"], "welfare")
    assert_workspace(["WELFARE_OFFICER"], "welfare")
