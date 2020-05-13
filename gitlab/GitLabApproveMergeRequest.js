/**
This workflow function approvea a merge request on a specified Gitlab project.
The script takes 4 arguments:
* gitlabURL -  the url of the GitLab instance
* projectid -  the numeric ID of the GitLab projct
* mergerequestfield -  the id of the custom field that contains the merge request id
* mergerequeststate -  the id of the custom field that contains the merge request state
* userKey - the key of a User Account Valut entry that must be created to store the GitLab API key -  username can be anything, the password must be the token

A log is written in /opt/polarion/data/logs/main/gitlabapprovemergerequest.log or in c:\polarion\data\logs\main\gitlabapprovemergerequest.log

TODO: add some error checking :)
*/
var JavaPackages = new JavaImporter(
       java.lang,
       java.io,  
       java.util,
       java.net,
       java.util.regex,
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

       function getMergeRequestState(input) {
           var obj = JSON.parse(input);
           return obj.state;
       }
       
       var outFile = new FileWriter("./logs/main/gitlabapprovemergerequest.log", true); 
       var out = new BufferedWriter(outFile);

       var wi = workflowContext.getTarget();
       var gitlabURL = arguments.getAsString("gitlabURL"); //url of gitlab server
       var id = arguments.getAsString("projectid"); //id of the gitlab project
       var userKey = arguments.getAsString("userKey"); //id of the user account vault key that stores the API token
       var token = getAPIToken(userKey);
       var mergerequestfield = arguments.getAsString("mergerequestidfield");
       log("[mergerequestfield] " + mergerequestfield);
       var mergerequestid = wi.getCustomField(mergerequestfield);
       log("[mergerequestid] " + mergerequestid);
       var mergerequeststate = arguments.getAsString("mergerequeststatefield");
       log("[mergerequeststate] " + mergerequeststate);

/**    Add check if at least 1 modification was "commited" to the branch/merge request */
	   
	   var commit_message = "Merge for " +  wi.getId();
       commit_message = commit_message.replaceAll(" ", "+");
       var urlstring = gitlabURL + "/api/v4/projects/" + id + "/merge_requests/" + mergerequestid + "/merge?merge_commit_message=" + commit_message;
       log(urlstring);
       var url = new URL(urlstring);
       var conn = url.openConnection();
       conn.setRequestMethod("PUT");
       conn.setRequestProperty("PRIVATE-TOKEN", token);
       var response =  conn.getResponseCode();
       log("Response: " + response);
       var body = getResponseBody(conn);
       log("Body: " + body);
       var state = getMergeRequestState(body);
       log("State: " + state);
       
       wi.setCustomField(mergerequeststate, String.valueOf(state));
}
