from flask_restful import Resource
from labelbee.schemas import DataSetSchema
from labelbee.db_functions import (
    new_dataset,
    dataset_list,
    get_dataset_by_id,
    delete_dataset_by_id,
    edit_dataset
)
from flask_restful import reqparse
from flask import abort
from labelbee.models import User

#TODO: Figure out if this or marshmal
parser = reqparse.RequestParser()
parser.add_argument("name")
parser.add_argument("description")

# TODO: Figure out authentication
#TODO: Figure out user shit 
class DatasetListAPI(Resource):
    def get(self):
        # if not current_user.is_authenticated:
        #     raise Forbidden("/rest/v2/datasets GET: login required !")
        try :
            datasets_schema = DataSetSchema(many=True)
            return datasets_schema.dump(dataset_list())
        except Exception as e:
            abort(500, e)

    def post(self):
        args = parser.parse_args()

        #TODO: Unhardcode user :)
        user = User.query.first()

        name = args["name"]
        description = args["description"]

        new_dataset(
            name=name,
            description=description,
            user=user,
        )
        #TODO: Return id 
        return {
            "success": True,
            "id": 1
        }

#TODO: Implement put and delete 
class DatasetAPI(Resource):

    def get(self, id):
        #TODO: Validate inputs 

        dataset_schema = DataSetSchema()
        try :
            dataset = get_dataset_by_id(id)
            return dataset_schema.dump(dataset)

        except Exception as e:
            abort(500)

    
    def put(self, id):
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
            abort(500)

    
    def delete(self, id):
        try: 
            delete_dataset_by_id(id)
        except Exception as e:
            abort(500)
        return {
            "success": True,
            "id": id
        }