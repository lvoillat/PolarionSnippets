/**
This workflow function create a new issue on a specified Gitlab project.
The script takes 4 arguments:
* gitlabURL -  the url of the GitLab instance
* projectid -  the numeric ID of the GitLab projct
* issue.field - the id of a string custom field to hold the id of the created Gitlab issue
* userKey - the key of a User Account Valut entry that must be created to store the GitLab API key -  username can be anything, the password must be the token
A log is written in /opt/polarion/data/logs/main/gitlabcreateissue.log or in c:\polarion\data\logs\main\gitlabcreateissue.log
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

    function getResponseBody(conn) {
        var br = new BufferedReader(new InputStreamReader((conn.getInputStream())));
        var sb = new StringBuilder();
        var output;
        while ((output = br.readLine()) != null) {
               sb.append(output);
        }
        return sb.toString();
    }

    function getIssueId(input) {
        var obj = JSON.parse(input);
        return obj.iid;
    }

    function getIssueURL(input) {
        var obj = JSON.parse(input);
        return obj.web_url;
    }

    var outFile = new FileWriter("./logs/main/gitlabcreateissue.log", true); 
    var out = new BufferedWriter(outFile);

    var wi = workflowContext.getTarget();
    var gitlabURL = arguments.getAsString("gitlabURL"); //url of gitlab server
    var id = arguments.getAsString("projectid"); //id of the gitlab project
    var userKey = arguments.getAsString("userKey"); //id of the user account vault key that stores the API token
    var issueidfield = arguments.getAsString("issue.field");
    var token = getAPIToken(userKey);
    var title = wi.getId() + " - " + wi.getTitle();
    var description = wi.getDescription().convertToPlainText().getContent();
    var urlstring = gitlabURL + "/api/v4/projects/" + id + "/issues?title=" + encodeURI(title) + "&description=" + encodeURI(description);
    log(urlstring);
    var url = new URL(urlstring);
    var conn = url.openConnection();
    conn.setRequestMethod("POST");
    conn.setRequestProperty("PRIVATE-TOKEN", token);
    var response =  conn.getResponseCode();
    log("Response: " + response);
    var body = getResponseBody(conn);
    log("Body: " + body);
    var iid = getIssueId(body);
    var issueURL = getIssueURL(body);
    log("[iid] " + iid);
    log("[url] " + issueURL);
    var role = wi.getProject().getHyperlinkRoleEnum().wrapOption("ref_ext");
    wi.setCustomField(issueidfield, String.valueOf(iid));
    wi.addHyperlink(issueURL, role);
    out.close();
}