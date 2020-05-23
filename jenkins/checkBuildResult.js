/**
 This workflow condition checks the a status of a Jenkins build and blocks the action if it is not OK.
 Argument:
 * buildfield: the id of the enum custom field that contains the Builds
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

var returnValue = "The merge cannot be approved because the tests failed."; 

with( JavaPackages ) {
    function log(str) {
           out.write(str + "\n");
           out.flush();
    }

    var outFile = new FileWriter("./logs/main/checkbuildresult.log", true); 
    var out = new BufferedWriter(outFile);
    log("-------START------");
    var wi = workflowContext.getTarget();
    var trackerService = wi.getTrackerService();
    var projectId = wi.getProject().getId();
    var buildField = arguments.getAsString("buildfield");
    var build = wi.getCustomField(buildField);
    log(build.toString());
    log(build.getId());

    var query = "buildArtifact.groupEntity.id:/default/" + projectId;
    log(query);
    var builds = trackerService.getDataService().searchInstances("Build", query, "id");
    for (var i = 0; i < builds.size(); i++) {
        var b = builds.get(i);
        var status = b.getBuildStatus().getType().getLabel();
        log("[ " + status + " " + b.getBuildTag() + " " + b.getBuildStamp() + " ]");
        if (b.getBuildStamp() == build.getId()) {
            log("Found!");
            if (status == "OK") {
                returnValue = true;
            }
        }
    }
    log("Return: " + returnValue);
    log("------END------");
    out.close();
    
    returnValue;
}
