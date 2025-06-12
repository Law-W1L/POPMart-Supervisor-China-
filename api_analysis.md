# Popmart API Analysis

## 1. Product List API
```
GET https://www.popmart.cn/api/goods/list
Parameters:
- page: Page number (starts from 1)
- pageSize: Items per page
- sort: Sort method (newest: Latest, hot: Popular)
- categoryId: Category ID
- seriesId: Series ID

Response format:
{
    "code": 200,
    "data": {
        "list": [
            {
                "id": "Product ID",
                "name": "Product Name",
                "price": "Price",
                "originalPrice": "Original Price",
                "image": "Product Image URL",
                "status": "Product Status",
                "releaseTime": "Release Time",
                "seriesName": "Series Name",
                "categoryName": "Category Name",
                "stock": "Stock Quantity",
                "sales": "Sales Volume"
            }
        ],
        "total": "Total Products",
        "page": "Current Page",
        "pageSize": "Items Per Page"
    },
    "message": "success"
}
```

## 2. Product Detail API
```
GET https://www.popmart.cn/api/goods/detail/{productId}
Parameters:
- id: Product ID

Response format:
{
    "code": 200,
    "data": {
        "id": "Product ID",
        "name": "Product Name",
        "price": "Price",
        "originalPrice": "Original Price",
        "images": ["Product Image URLs Array"],
        "description": "Product Description",
        "specifications": "Specifications",
        "status": "Product Status",
        "releaseTime": "Release Time",
        "seriesName": "Series Name",
        "categoryName": "Category Name",
        "stock": "Stock Quantity",
        "sales": "Sales Volume",
        "purchaseUrl": "Purchase URL"
    },
    "message": "success"
}
```

## 3. Purchase API
```
POST https://www.popmart.cn/api/order/create
Headers:
- Content-Type: application/json
- Authorization: Bearer {token}

Request body:
{
    "goodsId": "Product ID",
    "quantity": "Purchase Quantity",
    "addressId": "Shipping Address ID",
    "paymentMethod": "Payment Method"
}

Response format:
{
    "code": 200,
    "data": {
        "orderId": "Order ID",
        "paymentUrl": "Payment URL",
        "orderAmount": "Order Amount"
    },
    "message": "success"
}
```

## 4. Login API
```
POST https://www.popmart.cn/api/user/login
Request body:
{
    "username": "Username",
    "password": "Password"
}

Response format:
{
    "code": 200,
    "data": {
        "token": "Login Token",
        "userId": "User ID",
        "username": "Username"
    },
    "message": "success"
}
```

## Notes:
1. All API requests need to handle CORS issues
2. Purchase API requires user login token
3. Some APIs may have rate limits
4. Error handling and retry mechanisms are recommended
5. Need to handle product status (Sold Out, Pre-sale, etc.)

## Usage Recommendations:
1. Use proxy server to solve CORS issues
2. Implement token auto-refresh mechanism
3. Add request caching to reduce API calls
4. Implement request queue to avoid frequent requests
5. Add logging for debugging purposes 