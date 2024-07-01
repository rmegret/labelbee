from .filesystem import FileSystemStorage

class StorageFactory:
    def create(self, storage_type):
        if storage_type == 'file_system_storage':
            return FileSystemStorage()
        elif storage_type == "aws":
            raise ValueError(storage_type)
        
        elif storage_type == "cloud":
            raise ValueError(storage_type)

        raise ValueError(storage_type)