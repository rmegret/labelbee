"""Dataset endpoints, backed by DataInfrastructure collections.

A labelbee "dataset" is a DataInfrastructure collection (videos.collection_id).
Dataset ids are now UUID strings.
"""
from flask_restful import Resource, reqparse

from labelbee.services import datainfra
from labelbee.services.datainfra import DataInfraError
from ..constants import STATUS_CODE_200

parser = reqparse.RequestParser()
parser.add_argument("name")
parser.add_argument("description")
parser.add_argument("experiment_id")


def _error(e: DataInfraError):
    return {"success": False, "status_code": e.status_code, "error": e.message}, e.status_code


class DatasetListAPI(Resource):
    def get(self):
        """Lists datasets (same list-of-objects shape as before)."""
        try:
            return [datainfra.to_dataset(c) for c in datainfra.list_collections()]
        except DataInfraError as e:
            return _error(e)

    def post(self):
        """Creates a new dataset"""
        args = parser.parse_args()
        name = (args["name"] or "").strip() or "New Dataset"
        fields = {"collection_name": name}
        if args["description"]:
            fields["meta"] = {"description": args["description"]}
        if args["experiment_id"]:
            fields["experiment_id"] = args["experiment_id"]
        try:
            new_id = datainfra.create_collection(**fields)
        except DataInfraError as e:
            return _error(e)
        return {"success": True, "status_code": STATUS_CODE_200, "data": {"id": new_id}}


class DatasetAPI(Resource):
    def get(self, id):
        try:
            return datainfra.to_dataset(datainfra.get_collection(id))
        except DataInfraError as e:
            return _error(e)

    def put(self, id):
        """
        Updates dataset by id
        Input:
            name - dataset name
            description - dataset description
        """
        args = parser.parse_args()
        fields = {}
        if args["name"]:
            fields["collection_name"] = args["name"]
        if args["description"] is not None:
            fields["meta"] = {"description": args["description"]}
        try:
            datainfra.update_collection(id, **fields)
        except DataInfraError as e:
            return _error(e)
        return {"success": True, "id": id}

    def delete(self, id):
        """Deletes dataset by id (its videos are kept, just unassigned)."""
        try:
            datainfra.delete_collection(id)
        except DataInfraError as e:
            return _error(e)
        return {"success": True, "id": id}
