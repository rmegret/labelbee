from flask_restful import Resource
from flask_restful import reqparse
from flask import abort, current_app
from labelbee.models import User
from flask_user import current_user
from ..constants import STATUS_CODE_500, STATUS_CODE_401, STATUS_CODE_200
#from ...legacy/views import serve_files

from ...download.flask_range_requests import send_from_directory_partial, dir_listing, serve_files

import os

data_root_dir = os.environ.get("DATA_DIR")


# ENDPOINTS

parser = reqparse.RequestParser()
#parser.add_argument("path")
parser.add_argument("format", location=['args','form'], default="html", type=str, help="format of the response: html or json")

from flask import request, url_for

class RawDataAPI(Resource):
    
  #@api.expect(parser)
  def get(self, path=""):
      logger = current_app.logger
      
      if not current_user.is_authenticated:
          abort(STATUS_CODE_401, "Unauthenticated user")

      try :
          args = parser.parse_args()
          #path = args["path"]
          format = args["format"]

          logger.error(f'RawDataAPI.get(path={path},format={format})')

          #full_url = url_for(request.endpoint, **request.view_args)
          # Just the prefix (without the trailing ID or variable)
          #prefix = full_url.rsplit('/', 1)[0] + '/'
          
          base_dir = os.path.join(data_root_dir, "./")
          base_uri = url_for(request.endpoint, path="")  # '/rest/config/labellist/'

          direct_download_base_uri = url_for("download.send_data",path="")  # use url_for even if Apache will override the request
          logger.info(f"direct_download_base_uri={direct_download_base_uri}")

          return serve_files(base_dir, path, base_uri, direct_download_base_uri=direct_download_base_uri, format=format)

      except Exception as e:
          return {
                  "status": "error",
                  "message": str(e),
                  "code": STATUS_CODE_500,
              }
          #abort(STATUS_CODE_500)
