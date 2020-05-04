/**
This workflow function create a merge request on a specified Gitlab project.
The script takes 4 arguments:
* gitlabURL -  the url of the GitLab instance
* projectid -  the numeric ID of the GitLab projct
* branchfield -  the id of the custom field to fill to specify the branch name for which the merge request is created - this is a string custom field 
                     and must be defined for the workitem typen that uses this function
* userKey - the key of a User Account Valut entry that must be created to store the GitLab API key -  username can be anything, the password must be the token

The title of the merge request is the workitem id followed by the workitem title
A log is written in /opt/polarion/data/logs/main/gitlabmergerequest.log or in c:\polarion\data\logs\main\gitlabmergerequest.log

TODO: add some error checking :)
*/
var JavaPackages = new JavaImporter(
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

       var outFile = new FileWriter("./logs/main/gitlabmergerequest.log", true); 
       var out = new BufferedWriter(outFile);

       var wi = workflowContext.getTarget();
       var gitlabURL = arguments.getAsString("gitlabURL"); //url of gitlab server
       var id = arguments.getAsString("projectid"); //id of the gitlab project
       var cfname = arguments.getAsString("branchfield"); //id of the custom field that contains the branch name
       var userKey = arguments.getAsString("userKey"); //id of the user account vault key that stores the API token
       var token = getAPIToken(userKey);
       var branchname = wi.getCustomField(cfname);
       var title = wi.getId() + "_" + wi.getTitle().replace(" ", "_");
       var urlstring =" http://gitlab/api/v4/projects/" + id + "/merge_requests?source_branch=" + branchname + "&target_branch=master&title=" + title;
       log(urlstring);
       var url = new URL(urlstring);
       var conn = url.openConnection();
       conn.setRequestMethod("POST");
       conn.setRequestProperty("PRIVATE-TOKEN", token);
       var response =  conn.getResponseCode();
       log("Response: " + response);
}
