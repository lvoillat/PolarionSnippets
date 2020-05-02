from zeep import Client
from zeep.plugins import HistoryPlugin
from lxml.etree import Element
from lxml import etree
import datetime

class PolarionClient:
	session_wsdl = '/ws/services/SessionWebService?wsdl'
	tracker_wsdl = '/ws/services/TrackerWebService?wsdl'
	project_wsdl = '/ws/services/ProjectWebService?wsdl'
	test_wsdl = '/ws/services/TestManagementWebService?wsdl'

	def __init__(self, baseUrl):
		self.baseUrl = baseUrl
		self.historyPlugin = HistoryPlugin()

	def buildSessionClient(self):
		print(self.baseUrl, self.session_wsdl)
		sessionWsdlUrl = "{}{}".format(self.baseUrl, self.session_wsdl)
		print(sessionWsdlUrl)
		self.sessionClient = Client(sessionWsdlUrl, plugins=[self.historyPlugin])


	def login(self, username, password):
		self.buildSessionClient()
		self.sessionClient.service.logIn(username, password)
		tree = self.historyPlugin.last_received['envelope'].getroottree()
		self.sessionHeaderElement = tree.find('.//{http://ws.polarion.com/session}sessionID')

	def getTrackerServiceClient(self):
		trackerWsdlUrl = "{}{}".format(self.baseUrl, self.tracker_wsdl)
		print(trackerWsdlUrl)
		self.trackerClient = Client(trackerWsdlUrl, plugins=[self.historyPlugin])
		self.trackerClient.set_default_soapheaders([self.sessionHeaderElement])
		tracker = PolarionTrackerService(self.trackerClient)
		return tracker

	def getProjectServiceClient(self):
		projectWsdlUrl = "{}{}".format(self.baseUrl, self.project_wsdl)
		print(projectWsdlUrl)
		self.projectClient = Client(projectWsdlUrl, plugins=[self.historyPlugin])
		self.projectClient.set_default_soapheaders([self.sessionHeaderElement])
		projectClient = PolarionProjectService(self.projectClient)
		return projectClient

	def getTestServiceClient(self):
		testWsdlUrl = "{}{}".format(self.baseUrl, self.test_wsdl)
		print(testWsdlUrl)
		self.testClient = Client(testWsdlUrl, plugins=[self.historyPlugin])
		self.testClient.set_default_soapheaders([self.sessionHeaderElement])
		tc = PolarionTestServiceClient(self.testClient)
		return tc

class PolarionTestServiceClient:

	def __init__(self, testClient):
		self.testClient = testClient

	def createTestRun(self, project, idtr, template):
		out = self.testClient.service.createTestRun(project, idtr, template)
		return out

	def addTestRecord(self, trUri, tcUri, result, comment, authorUri, when, duration):
		comment = {}
		comment['content'] = 'comment'
		comment['type'] = 'text/html'
		comment['contentLossy'] = False
		out = self.testClient.service.addTestRecord(trUri, tcUri, result, comment, 
				authorUri, when, duration, 'subterra:data-service:objects:/default/DP-99999${WorkItem}drivepilot')
		return out

	def getTestRunById(self, project, testrun):
		out = self.testClient.service.getTestRunById(project, testrun)
		return out

class PolarionTrackerService:

	def __init__(self, trackerClient):
		self.trackerClient = trackerClient

	def queryWorkItems(self, query, sort, fields):
		out = self.trackerClient.service.queryWorkItems(query, sort, fields)
		return out

	def createWorkItem(self, projectId, t, title, ps):
		prj = ps.getProject(projectId)
		typeOption = self.getEnumOption(projectId, 'type', t)
		wi = {}
		wi['project'] = prj
		wi['type'] = typeOption
		wi['title'] = title
		out = self.trackerClient.service.createWorkItem(wi)

	def getAllEnumOptionIdsForId(self, projectId, enumId):
		out = self.trackerClient.service.getAllEnumOptionIdsForId(projectId, enumId)
		return out

	def getWorkitem(self, wid, pid):
		result = self.trackerClient.service.getWorkItemById(pid, wid)
		return result

	def getEnumOption(self, projectId, enumId, optionId):
		enums = self.getAllEnumOptionIdsForId(projectId, enumId)
		option = None
		for e in enums:
			if e['id'] == optionId:
				option = e
		return option

class PolarionProjectService:

	def __init__(self, projectServiceClient):
		self.projectClient = projectServiceClient

	def getProject(self, projectId):
		prj = self.projectClient.service.getProject(projectId)
		print(prj)
		return prj

	def getUser(self, user):
		user = self.projectClient.service.getUser(user)
		return user

if __name__ =="__main__":
	polClient = PolarionClient('http://ubuntupolarion/polarion')
	polClient.login('admin', 'admin')
	tracker = polClient.getTrackerServiceClient()
	projectService = polClient.getProjectServiceClient()
	testService = polClient.getTestServiceClient()
	#trUri = testService.createTestRun('drivepilot', '154220190103-4', 'Release Test')
	trUri = 'subterra:data-service:objects:/default/drivepilot${TestRun}154220190103-4'
	print(trUri)
	testcase = tracker.getWorkitem('drivepilot', 'DP-526')
	uri = testcase['uri']
	print(uri)
	user = projectService.getUser('admin')
	now = datetime.datetime.today()
	#result = testService.addTestRecord(trUri, uri, 'passed', 'comment text', user['uri'], now, 10.0)
	#print(result)
	tr = testService.getTestRunById('drivepilot', 'build_all-20170730-223807')
	print(tr)