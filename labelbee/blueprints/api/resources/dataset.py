from flask_restful import Resource
from labelbee.schemas import DataSetSchema
from labelbee.database import (
    new_dataset,
    dataset_list,
    get_dataset_by_id,
    delete_dataset_by_id,
    edit_dataset
)
from flask_restful import reqparse
from flask import abort
from labelbee.models import User
from flask_user import current_user
from ..constants import STATUS_CODE_500, STATUS_CODE_401, STATUS_CODE_200

#TODO: Figure out if this or marshmallow
parser = reqparse.RequestParser()
parser.add_argument("name")
parser.add_argument("description")


#TODO: Figure out user shit 
class DatasetListAPI(Resource):
    def get(self):
        """
        Lists datasets
        """
        if not current_user.is_authenticated:
            abort(STATUS_CODE_401, "Unauthenticated user")
        try :
            datasets_schema = DataSetSchema(many=True)
            return datasets_schema.dump(dataset_list())
        except Exception as e:
            abort(STATUS_CODE_500, e)

    def post(self):
        """
        Creates a new dataset
        """
        if not current_user.is_authenticated:
            abort(STATUS_CODE_401, "Unauthenticated user")
        args = parser.parse_args()

        name = args["name"]
        description = args["description"]

        dataset = new_dataset(
            name=name,
            description=description,
            user=current_user,
        )
        #TODO: Return id 
        return {
            "success": True,
            "status_code": STATUS_CODE_200,
            "data": {
                "id": dataset.id
            }
        }

#TODO: Implement put and delete 
class DatasetAPI(Resource):

    def get(self, id):
        if not current_user.is_authenticated:
            abort(STATUS_CODE_401, "Unauthenticated user")
        #TODO: Validate inputs 

        dataset_schema = DataSetSchema()
        try :
            dataset = get_dataset_by_id(id)
            return dataset_schema.dump(dataset)

        except Exception as e:
            abort(STATUS_CODE_500)

    
    def put(self, id):
        """
        Updates dataset by id
        Input: 
            name - dataset name
            description - dataset description
        """
        if not current_user.is_authenticated:
            abort(STATUS_CODE_401, "Unauthenticated user")
        args = parser.parse_args()
        name = args["name"]
        description = args["description"]

        dataset_schema = DataSetSchema()
        try :
            edit_dataset(id, name, description)
            return {
                "success": True,
                "id": id
            }

        except Exception as e:
            abort(STATUS_CODE_500)

    
    def delete(self, id):
        """
        Deletes dataset by id 
        """
        if not current_user.is_authenticated:
            abort(STATUS_CODE_401, "Unauthenticated user")

        try: 
            delete_dataset_by_id(id)
        except Exception as e:
            abort(STATUS_CODE_500)
        return {
            "success": True,
            "id": id
        }