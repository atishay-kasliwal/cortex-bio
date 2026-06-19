# cortexbio

Python SDK for the [Cortex Bio](https://github.com/atriveo/cortex-bio) Wearable Intelligence API.

## Install

```bash
pip install cortexbio
```

## Usage

```python
import os
from cortexbio import CortexBio

with CortexBio(api_key=os.environ["CORTEX_BIO_API_KEY"]) as client:
    readiness = client.readiness.today()
    print(readiness["readiness_score"])

    forecast = client.forecast.today()
    chronotype = client.chronotype.get()
```

Self-hosted:

```python
client = CortexBio(api_key="cb_test_...", base_url="http://localhost:8000")
```
