import os
import json
from urllib.request import Request, urlopen
from urllib.error import URLError

github_token = os.environ.get('GITHUB_TOKEN')
headers = {
    'Authorization': f'token {github_token}',
    'Accept': 'application/vnd.github.v3+json'
}

def github_api_request(url, method='GET', data=None):
    request = Request(url, headers=headers, method=method)
    if data:
        request.data = json.dumps(data).encode()
    try:
        with urlopen(request) as response:
            return json.loads(response.read().decode())
    except URLError as e:
        return {'error': str(e)}

create_url = 'https://api.github.com/user/repos'
create_data = {
    'name': 'solutions-calendar',
    'description': 'A 12-month calendar app with event highlighting and pop-up details using Flask and Vanilla JS',
    'private': False
}

create_response = github_api_request(create_url, method='POST', data=create_data)
print(f"Create repository response: {json.dumps(create_response, indent=2)}")

if 'html_url' in create_response:
    print(f"Repository created successfully. URL: {create_response['html_url']}")
else:
    print(f"Failed to create repository. Error: {create_response.get('message', 'Unknown error')}")
