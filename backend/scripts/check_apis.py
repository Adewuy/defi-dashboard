"""
scripts/check_apis.py — Validates connectivity to DeFiLlama and CoinGecko.
No API keys required for the free endpoints tested here.

Run: python scripts/check_apis.py
"""
import asyncio
import sys
import json

sys.path.insert(0, ".")


async def check_defillama():
    print("── DeFiLlama ─────────────────────────────────────────────────────")
    import httpx

    async with httpx.AsyncClient(timeout=20.0) as client:

        # 1. Fees overview
        print("  Fetching /overview/fees …", end=" ", flush=True)
        try:
            r = await client.get("https://api.llama.fi/overview/fees", params={
                "excludeTotalDataChart": "true",
                "excludeTotalDataChartBreakdown": "true",
            })
            r.raise_for_status()
            data = r.json()
            protocols = data.get("protocols", [])
            print(f"✅  {len(protocols)} protocols returned")

            # Find Aave specifically
            aave = next((p for p in protocols if p.get("slug") == "aave"), None)
            if aave:
                print(f"     Aave: daily_fees=${aave.get('total24h',0):,.0f}  category={aave.get('category','?')}")
        except Exception as e:
            print(f"❌  {e}")

        # 2. Per-protocol revenue
        print("  Fetching /summary/fees/aave?dataType=dailyRevenue …", end=" ", flush=True)
        try:
            r = await client.get("https://api.llama.fi/summary/fees/aave", params={"dataType": "dailyRevenue"})
            r.raise_for_status()
            data = r.json()
            chart = data.get("totalDataChart", [])
            if chart:
                last = chart[-1]
                ts, val = (last[0], last[1]) if isinstance(last, list) else (0, 0)
                print(f"✅  {len(chart)} daily points  last=${val:,.0f}")
            else:
                print(f"✅  (no chart data)  keys={list(data.keys())[:6]}")
        except Exception as e:
            print(f"❌  {e}")

        # 3. TVL
        print("  Fetching /tvl/aave …", end=" ", flush=True)
        try:
            r = await client.get("https://api.llama.fi/tvl/aave")
            r.raise_for_status()
            val = r.json()
            if isinstance(val, (int, float)):
                print(f"✅  TVL=${val:,.0f}")
            elif isinstance(val, list) and val:
                last = val[-1]
                print(f"✅  {len(val)} points  last TVL=${last.get('totalLiquidityUSD',0):,.0f}")
            else:
                print(f"✅  response type={type(val).__name__}")
        except Exception as e:
            print(f"❌  {e}")

        # 4. Protocol metadata
        print("  Fetching /protocol/gmx …", end=" ", flush=True)
        try:
            r = await client.get("https://api.llama.fi/protocol/gmx")
            r.raise_for_status()
            data = r.json()
            print(f"✅  name={data.get('name')}  category={data.get('category')}")
        except Exception as e:
            print(f"❌  {e}")


async def check_coingecko():
    print("\n── CoinGecko ─────────────────────────────────────────────────────")
    import httpx

    async with httpx.AsyncClient(timeout=20.0, headers={"User-Agent": "DeFiSustainabilityDashboard/1.0"}) as client:

        # 1. Batch prices
        ids = "aave,uniswap,gmx,curve-dao-token,lido-dao,maker"
        print(f"  Fetching /simple/price for {len(ids.split(','))} tokens …", end=" ", flush=True)
        try:
            r = await client.get("https://api.coingecko.com/api/v3/simple/price", params={
                "ids": ids,
                "vs_currencies": "usd",
            })
            r.raise_for_status()
            data = r.json()
            prices = {k: v.get("usd", 0) for k, v in data.items()}
            print(f"✅  {len(prices)} prices")
            for token, price in prices.items():
                print(f"     {token:<22} ${price:>10,.2f}")
        except Exception as e:
            print(f"❌  {e}")

        # 2. Token detail
        print("  Fetching /coins/aave market data …", end=" ", flush=True)
        try:
            r = await client.get("https://api.coingecko.com/api/v3/coins/aave", params={
                "localization": "false",
                "tickers": "false",
                "community_data": "false",
                "developer_data": "false",
            })
            r.raise_for_status()
            data = r.json()
            md = data.get("market_data", {})
            price = md.get("current_price", {}).get("usd", 0)
            mcap  = md.get("market_cap", {}).get("usd", 0)
            supply = md.get("circulating_supply", 0)
            print(f"✅  price=${price:,.2f}  mcap=${mcap/1e9:.2f}B  supply={supply:,.0f}")
        except Exception as e:
            print(f"❌  {e}")

        # 3. Historical prices
        print("  Fetching 7d price history for GMX …", end=" ", flush=True)
        try:
            r = await client.get("https://api.coingecko.com/api/v3/coins/gmx/market_chart", params={
                "vs_currency": "usd", "days": "7", "interval": "daily",
            })
            r.raise_for_status()
            prices_list = r.json().get("prices", [])
            print(f"✅  {len(prices_list)} daily price points")
            if prices_list:
                ts, p = prices_list[-1]
                print(f"     Latest GMX: ${p:.2f}")
        except Exception as e:
            print(f"❌  {e}")


async def run_full_emission_estimate():
    """Demonstrate real yield calculation with live data."""
    print("\n── Live Real Yield Demo ──────────────────────────────────────────")
    import httpx, sys
    sys.path.insert(0, ".")

    # Inline engine (no DB deps)
    exec_globals = {}
    exec(open("app/analytics/engine.py").read(), exec_globals)
    compute_sustainability_score = exec_globals["compute_sustainability_score"]
    SustainabilityInputs = exec_globals["SustainabilityInputs"]

    EMISSION_ESTIMATES = {
        "aave":  3_000,
        "gmx":   1_200,
        "curve": 600_000,
    }
    TOKEN_IDS = {"aave": "aave", "gmx": "gmx", "curve": "curve-dao-token"}

    async with httpx.AsyncClient(timeout=20.0) as client:
        # Prices
        ids_str = ",".join(TOKEN_IDS.values())
        prices_resp = await client.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": ids_str, "vs_currencies": "usd"},
        )
        prices = {k: v.get("usd", 0) for k, v in prices_resp.json().items()}

        # Revenue
        fees_resp = await client.get("https://api.llama.fi/overview/fees", params={
            "excludeTotalDataChart": "true",
            "excludeTotalDataChartBreakdown": "true",
        })
        protocols_data = fees_resp.json().get("protocols", [])
        revenue_by_slug = {p.get("slug", ""): p for p in protocols_data}

        print(f"  {'Protocol':<14} {'Revenue/d':>12} {'Emissions/d':>12} {'Real Yield/d':>14} {'Score':>6}")
        print("  " + "-" * 62)

        for slug in ["aave", "gmx", "curve"]:
            cg_id = TOKEN_IDS[slug]
            price = prices.get(cg_id, 0)
            tokens_day = EMISSION_ESTIMATES[slug]
            daily_emis = tokens_day * price
            daily_rev = float(revenue_by_slug.get(slug, {}).get("total24h", 0) or 0)

            if daily_rev == 0:
                print(f"  {slug:<14} (no revenue data from DeFiLlama)")
                continue

            inputs = SustainabilityInputs(
                daily_revenue=daily_rev,
                daily_emissions=daily_emis,
                tvl_current=1,
                tvl_7d_ago=1,
                revenue_history=[daily_rev] * 7,
                emissions_history=[daily_emis] * 7,
                tvl_history=[1] * 7,
            )
            result = compute_sustainability_score(inputs)
            ry_str = (f"+${result.real_yield/1e3:.0f}K" if result.real_yield >= 0
                      else f"-${abs(result.real_yield)/1e3:.0f}K")
            print(f"  {slug:<14} ${daily_rev/1e3:>9,.0f}K  ${daily_emis/1e3:>9,.0f}K  {ry_str:>14}  {result.score:>5.1f}")


async def main():
    print("\n🔍 DeFi Sustainability Dashboard — API Connectivity Check\n")
    await check_defillama()
    await check_coingecko()
    await run_full_emission_estimate()
    print("\n✅ Connectivity check complete.\n")


if __name__ == "__main__":
    asyncio.run(main())
