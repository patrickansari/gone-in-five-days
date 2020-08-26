
function findlabelledEmails() {
  
  var labels = GmailApp.getUserLabels();
  var periods = [];
  
  for(i=0;i< labels.length; i++){
    
    var label = labels[i].getName(); 
    var period;
    
    if(label.indexOf("gone-in-days") != -1 && label.indexOf("/") != -1) {
      
      period = parseInt(label.substring(label.indexOf("/")+1));
     
      if(!isNaN(period)) {
        periods.push(period); 
      }
    }  
  }
  
  for(x=0; x < periods.length; x++) {
    deleteEmails(periods[x]);
  }
  
} 

function deleteEmails(period) {
  
  var today = new Date();
  
  var millisPerDay = 1000 * 60 * 60 * 24;
  var numberToDelete = 0;
  var threads = GmailApp.search("label:gone-in-days/" + period.toString());
 
  Logger.log("No of emails found: " + threads.length);
 
  for( i=0;i < threads.length; i++) {
    var daysOld = Math.floor((today - threads[i].getMessages()[0].getDate()) / millisPerDay);
    
    if (daysOld > period) {
      Logger.log("Email Subject: " + threads[i].getFirstMessageSubject());
      Logger.log("Email Age: " + daysOld);
      numberToDelete++;
      threads[i].moveToTrash();
    }
  }
  
  Logger.log("No of emails deleted: " + numberToDelete);
}
