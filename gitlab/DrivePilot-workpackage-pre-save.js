var returnValue=workItem.getValue("sourceBranchName");

var inValid = new RegExp('^[-.&_A-z0-9]{1,}$');


if (inValid.test(returnValue)){
	returnValue = true;
}
else
{
	returnValue = "Not able to Save, Field 'Source Branch Name' can't contain spaces ' ' or comma ',' and '&' !!!";
}
