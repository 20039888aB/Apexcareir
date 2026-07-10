from django.db import transaction

from apps.inventory.models import Product, StockMovement
from apps.sales.models import Sale


def force_delete_product(product: Product):
    with transaction.atomic():
        for sale in list(product.sales.all()):
            sale.delete()
        for transfer in list(product.stock_transfers.all()):
            transfer.delete()
        for adjustment in list(product.stock_adjustments.all()):
            adjustment.delete()
        for receipt in list(product.stock_receipts.all()):
            receipt.delete()
        StockMovement.objects.filter(product=product).delete()
        product.delete()


def purge_product_history(product: Product):
    deleted_count, _ = StockMovement.objects.filter(product=product).delete()
    return deleted_count
