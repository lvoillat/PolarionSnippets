var JavaPackages = new JavaImporter(
       java.io,  
       java.util,
       java.net,
       com.polarion.platform, 
       com.polarion.platform.core, 
       com.polarion.platform.context, 
       com.polarion.platform.jobs,
       com.polarion.platform.persistence.model
); 
 
with( JavaPackages ) {
       function log(str) {
              out.write(str + "\n");
              out.flush();
       }

       var outFile = new FileWriter("./logs/main/gitlabbranch.log", true); 
       var out = new BufferedWriter(outFile);

       var wi = workflowContext.getTarget();
       var gitlabURL = arguments.getAsString("gitlabURL"); //url of gitlab server
       var id = arguments.getAsString("projectid"); //id of the gitlab project
       var cfname = arguments.getAsString("branchfield"); //id of the custom field that contains the branch name
       var token = ""; //gitlab API token
       var branchname = wi.getCustomField(cfname);
       var urlstring = gitlabURL + "/api/v4/projects/" + id + "/repository/branches?branch=" + branchname + "&ref=master"  //the branch is made from master
       log(urlstring);
       var url = new URL(urlstring);
       var conn = url.openConnection();
       conn.setRequestMethod("POST");
       conn.setRequestProperty("PRIVATE-TOKEN", token);
       var response =  conn.getResponseCode();
       log("Response: " + response);
}
