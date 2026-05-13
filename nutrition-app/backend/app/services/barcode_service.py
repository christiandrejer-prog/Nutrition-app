import requests


def fetch_product_by_barcode(barcode: str):
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"

    response = requests.get(url)
    data = response.json()

    if data.get("status") != 1:
        return None

    product = data.get("product", {})

    return {
        "name": product.get("product_name"),
        "brand": product.get("brands"),
        "nutrition": product.get("nutriments", {})
    }