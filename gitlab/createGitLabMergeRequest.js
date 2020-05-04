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
