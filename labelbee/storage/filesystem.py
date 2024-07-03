import os
import uuid 

import dotenv
from dotenv import load_dotenv

load_dotenv()

class FileSystemStorage:

    # TODO: Add feature to create directory if it doesn't exist
    ROOT_PATH = os.getenv('ROOT_PATH')

    def put(self, file):

        file_id =  uuid.uuid4()
        try :
            with open(f"{self.ROOT_PATH}/{file_id}.mp4", 'wb') as f:
                f.write(file)
            return {
                "success": True,
                "id": file_id
            }
        
        except Exception as e:
            return {
                "success": False
            }
    
    def get(self, file_id):
        try :
            with open(f"{self.ROOT_PATH}/{file_id}.mp4", 'rb') as f:
                file = f.read()
            return {
                "success": True,
                "id": id,
                "file": file
            }
        except Exception as e:
            print(e)
            return {
                "success": False,
                "file_id": file_id
            }
