/**
This workflow function create a merge request on a specified Gitlab project.
The script takes 4 arguments:
* gitlabURL -  the url of the GitLab instance
* projectid -  the numeric ID of the GitLab projct
* branchfield -  the id of the custom field to fill to specify the branch name for which the merge request is created - this is a string custom field 
                     and must be defined for the workitem typen that uses this function
* mergerequestfield -  the id of the custom field that contains the merge request id
* mergerequeststate -  the id of the custom field that contains the merge request state
* userKey - the key of a User Account Valut entry that must be created to store the GitLab API key -  username can be anything, the password must be the token

The title of the merge request is the workitem id followed by the workitem getTitle
A log is written in /opt/polarion/data/logs/main/gitlabmergerequest.log or in c:\polarion\data\logs\main\gitlabmergerequest.log

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

       function getMergeRequestId(input) {
              var pattern = ".*\"iid\":([0-9]+),.*";
              var r = Pattern.compile(pattern);
              var matcher = r.matcher(input);
              if (matcher.find()) {
                     log(matcher.group(0));
                     log(matcher.group(1));
                     return matcher.group(1);
              }
              else {
                     log("No matches");
              }
       }

       function getMergeRequestState(input) {
           var pattern = ".*\"state\":([0-9]+),.*";
           var r = Pattern.compile(pattern);
           var matcher = r.matcher(input);
           if (matcher.find()) {
                  log(matcher.group(0));
                  log(matcher.group(1));
                  return matcher.group(1);
           }
           else {
                  log("No matches");
           }
       }

       var outFile = new FileWriter("./logs/main/gitlabmergerequest.log", true); 
       var out = new BufferedWriter(outFile);

       var wi = workflowContext.getTarget();
       var gitlabURL = arguments.getAsString("gitlabURL"); //url of gitlab server
       var id = arguments.getAsString("projectid"); //id of the gitlab project
       var cfname = arguments.getAsString("branchfield"); //id of the custom field that contains the branch name
       var userKey = arguments.getAsString("userKey"); //id of the user account vault key that stores the API token
       var mergerequestfield = arguments.getAsString("mergerequestidfield");
       var mergerequeststate = arguments.getAsString("mergerequestidfield");
       var token = getAPIToken(userKey);
       var branchname = wi.getCustomField(cfname);
       var title = wi.getId() + "_" + wi.getTitle().replaceAll(" ", "_");
/**       var urlstring = gitlabURL + "/api/v4/projects/" + id + "/merge_requests?source_branch=" + branchname + "&target_branch=master&title=" + title; */
       var urlstring = gitlabURL + "/api/v4/projects/" + id + "/merge_requests?source_branch=" + branchname + "&target_branch=master&title=" + title + "&remove_source_branch=true";
       log(urlstring);
       var url = new URL(urlstring);
       var conn = url.openConnection();
       conn.setRequestMethod("POST");
       conn.setRequestProperty("PRIVATE-TOKEN", token);
       var response =  conn.getResponseCode();
       log("Response: " + response);
       var body = getResponseBody(conn);
       log("Body: " + body);
       var iid = getMergeRequestId(body);
       log("Iid: " + iid);
       var state = getMergeRequestState(body);
       log("State: " + state);
       
       wi.setCustomField(mergerequestfield, iid);
       wi.setCustomField(mergerequeststate, state);
}
