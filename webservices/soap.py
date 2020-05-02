#https://python-zeep.readthedocs.io/en/master/
from zeep import Client
from zeep.plugins import HistoryPlugin
from lxml.etree import Element
from lxml import etree

SESSION_SERVICE_URL = 'http://<some_server>/polarion/ws/services/SessionWebService?wsdl'
TEST_SERVICE_URL = 'http://<some_server>/polarion/ws/services/TestManagementWebService?wsdl'

PROJECT_ID = 'drivepilot'
TESTRUN_ID = 'build_all-20170730-223807'

history = HistoryPlugin()
sessionClient = Client(SESSION_SERVICE_URL, plugins=[history])
sessionClient.service.logIn('admin', 'admin')
tree = history.last_received['envelope'].getroottree()
#get the session id from the raw xml of the response
sessionHeaderElement = tree.find('.//{http://ws.polarion.com/session}sessionID')

testClient = Client(TEST_SERVICE_URL, plugins=[history])
#inject the session id in the request headers
testClient.set_default_soapheaders([sessionHeaderElement])
tr = testClient.service.getTestRunById(PROJECT_ID, TESTRUN_ID)