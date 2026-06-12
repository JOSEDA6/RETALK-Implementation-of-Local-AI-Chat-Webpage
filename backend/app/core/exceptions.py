"""
自定义异常模块 (exceptions)

@description 统一定义业务异常类，继承自 FastAPI 的 HTTPException，
             使各模块可以直接 raise 语义化异常而无需重复拼装 HTTP 状态码。
@author 施乔
"""

from fastapi import HTTPException, status

# 下面这些异常类就是"错误快捷方式"。比如要返回 404，
#         直接 raise NotFoundException("xxx") 就行，不用每次手写状态码。


class AppException(HTTPException):
    """应用异常基类，所有业务异常均继承自此类。

    Args:
        status_code: HTTP 状态码。
        detail:      返回给客户端的错误描述文本。
    """
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)


class NotFoundException(AppException):
    """资源未找到异常 (HTTP 404)。

    Args:
        detail: 错误描述，默认 "Resource not found"。
    """
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ValidationException(AppException):
    """请求参数校验失败异常 (HTTP 400)。

    Args:
        detail: 错误描述，默认 "Validation failed"。
    """
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class UnauthorizedException(AppException):
    """身份认证失败异常 (HTTP 401)。

    Args:
        detail: 错误描述，默认 "Unauthorized"。
    """
    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class FileTooLargeException(AppException):
    """上传文件超过大小限制异常 (HTTP 413)。

    Args:
        detail: 错误描述，默认 "File too large"。
    """
    def __init__(self, detail: str = "File too large"):
        super().__init__(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=detail)
