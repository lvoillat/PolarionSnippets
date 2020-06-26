/**
This workflow function close a GitLab Issue
The script takes 4 arguments:
* gitlabURL -  the url of the GitLab instance
* projectid -  the numeric ID of the GitLab projct
* issue.field - the id of a string custom field to hold the id of the created Gitlab issue
* userKey - the key of a User Account Valut entry that must be created to store the GitLab API key -  username can be anything, the password must be the token
A log is written in /opt/polarion/data/logs/main/gitlabcloseissue.log or in c:\polarion\data\logs\main\gitlabcloseissue.log
TODO: add some error checking :)
*/
var JavaPackages = new JavaImporter(
    java.lang,
    java.io,  
    java.util,
    java.net,
    com.polarion.platform, 
    com.polarion.platform.core, 
    com.polarion.platform.context, 
    com.polarion.platform.jobs,
    com.polarion.platform.persistence.model,
    com.polarion.platform.internal.security
); 

with( JavaPackages ) {
    function log(str) {
           out.write(str + "\n");
           out.flush();
    }

    function getAPIToken(userKey) {
           var vault = UserAccountVault.getInstance();
           var cred = vault.getCredentialsForKey(userKey);
           return cred.getPassword(); //cred.getUser()
    }

    var outFile = new FileWriter("./logs/main/gitlabcloseissue.log", true); 
    var out = new BufferedWriter(outFile);

    var wi = workflowContext.getTarget();
    var gitlabURL = arguments.getAsString("gitlabURL"); //url of gitlab server
    var id = arguments.getAsString("projectid"); //id of the gitlab project
    var userKey = arguments.getAsString("userKey"); //id of the user account vault key that stores the API token
    var issueidfield = arguments.getAsString("issue.field");
    var token = getAPIToken(userKey);
    var issueId = wi.getCustomField(issueidfield);
    var urlstring = gitlabURL + "/api/v4/projects/" + id + "/issues/" + issueId + "?state_event=close";
    log(urlstring);
    var url = new URL(urlstring);
    var conn = url.openConnection();
    conn.setRequestMethod("PUT");
    conn.setRequestProperty("PRIVATE-TOKEN", token);
    var response =  conn.getResponseCode();
    log("Response: " + response);

    out.close();
}