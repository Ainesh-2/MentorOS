from fastapi.testclient import TestClient


def test_regular_login_returns_clear_error_for_unknown_email(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "missing@example.com", "password": "secret123"},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == 401
    assert "does not exist" in response.json()["detail"].lower()


def test_register_creates_user_with_hashed_password(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new.user@example.com",
            "password": "secret123",
            "full_name": "New User",
            "role": "Student",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body


def test_register_and_login_round_trip(client: TestClient):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "round.trip@example.com",
            "password": "secret123",
            "full_name": "Round Trip",
            "role": "Student",
        },
    )
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": "round.trip@example.com", "password": "secret123"},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert login_response.status_code == 200
    body = login_response.json()
    assert "access_token" in body
