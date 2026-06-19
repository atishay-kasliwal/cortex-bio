from __future__ import annotations

from typing import Any

import httpx


class CortexBioError(Exception):
    def __init__(self, message: str, status: int, body: str) -> None:
        super().__init__(message)
        self.status = status
        self.body = body


class CortexBio:
    def __init__(self, api_key: str, base_url: str = "https://api.cortex.bio") -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json",
            },
            timeout=30.0,
        )

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        res = self._client.request(method, path, **kwargs)
        if res.status_code >= 400:
            raise CortexBioError(
                f"Cortex Bio API {res.status_code}: {res.text}",
                res.status_code,
                res.text,
            )
        return res.json()

    @property
    def readiness(self) -> "ReadinessAPI":
        return ReadinessAPI(self)

    @property
    def chronotype(self) -> "ChronotypeAPI":
        return ChronotypeAPI(self)

    @property
    def windows(self) -> "WindowsAPI":
        return WindowsAPI(self)

    @property
    def forecast(self) -> "ForecastAPI":
        return ForecastAPI(self)

    @property
    def analytics(self) -> "AnalyticsAPI":
        return AnalyticsAPI(self)

    @property
    def predictions(self) -> "PredictionsAPI":
        return PredictionsAPI(self)

    @property
    def models(self) -> "ModelsAPI":
        return ModelsAPI(self)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "CortexBio":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()


class ReadinessAPI:
    def __init__(self, client: CortexBio) -> None:
        self._c = client

    def today(self) -> dict[str, Any]:
        return self._c._request("GET", "/v1/readiness/today")

    def history(self, days: int = 30) -> dict[str, Any]:
        return self._c._request("GET", f"/v1/readiness/history?days={days}")

    def baselines(self) -> dict[str, Any]:
        return self._c._request("GET", "/v1/baselines")


class ChronotypeAPI:
    def __init__(self, client: CortexBio) -> None:
        self._c = client

    def get(self) -> dict[str, Any]:
        return self._c._request("GET", "/v1/chronotype")


class WindowsAPI:
    def __init__(self, client: CortexBio) -> None:
        self._c = client

    def today(self) -> dict[str, Any]:
        return self._c._request("GET", "/v1/windows/today")

    def week(self) -> dict[str, Any]:
        return self._c._request("GET", "/v1/windows/week")


class ForecastAPI:
    def __init__(self, client: CortexBio) -> None:
        self._c = client

    def today(self) -> dict[str, Any]:
        return self._c._request("GET", "/v1/forecast")


class AnalyticsAPI:
    def __init__(self, client: CortexBio) -> None:
        self._c = client

    def insights(self, limit: int = 20) -> dict[str, Any]:
        return self._c._request("GET", f"/v1/insights?limit={limit}")

    def correlations(self) -> dict[str, Any]:
        return self._c._request("GET", "/v1/correlations")

    def trends(self, days: int = 30) -> dict[str, Any]:
        return self._c._request("GET", f"/v1/trends?days={days}")


class PredictionsAPI:
    def __init__(self, client: CortexBio) -> None:
        self._c = client

    def tomorrow(self) -> dict[str, Any]:
        return self._c._request("GET", "/v1/predictions/tomorrow")

    def week(self) -> dict[str, Any]:
        return self._c._request("GET", "/v1/predictions/week")


class ModelsAPI:
    def __init__(self, client: CortexBio) -> None:
        self._c = client

    def status(self) -> dict[str, Any]:
        return self._c._request("GET", "/v1/models/status")
