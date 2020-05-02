/**
*  cfID: the id if the custom field 
*  doc: the IModule object to set
*  wi: the workitem
*/
function setDocInCustomField(cfId, doc, wi) {
              var wiTypeEnum = trackerService.getTrackerProject(prj).getWorkItemTypeEnum().wrapOption(wi.getType().getId());

              var cf = trackerService.getDataService().getCustomFieldsService().getCustomField(cfId, "WorkItem", wi.getContextId(), wiTypeEnum);

              var cfEnum = trackerService.getDataService().getEnumerationForEnumId(cf.getType(), wi.getContextId());
              
              if (doc.getModuleFolder() == "_default") {
                     var docPath  = doc.getModuleFolder() +" / "+ doc.getModuleName()            
              }
              else {
                     var docPath = doc.getModuleNameWithSpace() 
              }
              var docEnumOpt = cfEnum.wrapOption(docPath);

              wi.setValue(cfId, docEnumOpt);
       }

