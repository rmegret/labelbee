from marshmallow import fields, ValidationError


class Path(fields.Field):
    """Validates path to file."""

    def _serialize(self, value, attr, obj, **kwargs):
        try:
            if isinstance(value, bytes):
                value = str(value.decode("utf-8"))
            elif isinstance(value, str):
                pass
            else:
                raise ValidationError("File name must be a string")
        except:
            raise ValidationError("File name must be a string")

        if value.startswith("/"):
            raise ValidationError("Path must not start with /")
        elif not value.endswith("/"):
            raise ValidationError("Path must end with /")
        else:
            return value

    def _deserialize(self, value, attr, data, **kwargs):
        return value


class FileName(fields.Field):
    """Validates file name."""

    def _serialize(self, value, attr, obj, **kwargs):
        try:
            if isinstance(value, bytes):
                value = str(value.decode("utf-8"))
            elif isinstance(value, str):
                pass
            else:
                raise ValidationError("File name must be a string")
        except:
            raise ValidationError("File name must be a string")

        if value.startswith("/"):
            raise ValidationError("Path must not start with /")
        elif value.endswith("/"):
            raise ValidationError("Path must not end with /")
        else:
            return value

    def _deserialize(self, value, attr, data, **kwargs):
        return value
