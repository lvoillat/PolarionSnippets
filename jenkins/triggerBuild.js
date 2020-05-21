/**
 * This workflow function trigger a job in Jenkins, getting the job from an enumeration
 * jobfield: the id if the custom field that contains the list of jobs id to trigger
 * jenkinsurl: the base address of the Jenkins server
 * userKey: the key of a User Account Vault entry that must be created to store the Jenkins username and token  
 * 
 * Once triggered the job, it is not possibile to retrieve it result without polling 
 * the status of the job,  * and so blocking the function execution. 
 * The polling is not implemented.
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

    function getAPIUsername(userKey) {
        var vault = UserAccountVault.getInstance();
        var cred = vault.getCredentialsForKey(userKey);
        return cred.getUser()
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

    var outFile = new FileWriter("./logs/main/triggerbuild.log", true); 
    var out = new BufferedWriter(outFile);

    var wi = workflowContext.getTarget();
    var jobfield = arguments.getAsString("jobfield");
    var jenkinsurl = arguments.getAsString("jenkinsurl");
    var userKey = arguments.getAsString("userKey")
    var job = wi.getCustomField("jobid");

    log(job.getId());
    var endopoint = jenkinsurl + "/job/" + job.getId() + "/build";

    var url = new URL(endopoint);
    var conn = url.openConnection();
    conn.setRequestMethod("POST");
    var user = getAPIUsername(userKey);
    var token = getAPIToken(userKey);
    var auth = user + ":" + token;
    auth = Base64.getEncoder().encodeToString(auth.getBytes());
    log(auth);
    conn.setRequestProperty("Authorization", "Basic " + auth);
    var response =  conn.getResponseCode();
    log("[Response:] " + response);
    var location = conn.getHeaderField("Location");
    log("[Location] " + location);


    out.close();
}