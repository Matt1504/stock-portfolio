export function isEqual(obj1: any, obj2: any) {
  var props1 = Object.getOwnPropertyNames(obj1);
  var props2 = Object.getOwnPropertyNames(obj2);
  if (props1.length !== props2.length) {
    return false;
  }
  for (var i = 0; i < props1.length; i++) {
    let val1 = obj1[props1[i]];
    let val2 = obj2[props1[i]];
    let isObjects = isObject(val1) && isObject(val2);
    if ((isObjects && !isEqual(val1, val2)) || (!isObjects && val1 !== val2)) {
      return false;
    }
  }
  return true;
}

function isObject(object: Object) {
  return object != null && typeof object === "object";
}

export function formatDate(date: string) {
  var d = new Date();
  if (date) {
    d = new Date(date);
  }
  var month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();
  
  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
}

export function convertStringToDate(date: string) {
  // date string follow yyyy-mm-dd format
  var doo = new Date(date);
  // eliminate the unwanted offset
  return new Date( doo.getTime() - doo.getTimezoneOffset() * -60000 );
}

export function getMinMaxDate(min: boolean = true) {
  var timeValue = 8640000000000000;
  if (min) {
    timeValue *= -1;
  }
  return new Date(timeValue);
}

export function compareDates(dateA: Date, dateB: Date) {
  var time1 = new Date(dateA).getTime();
  var time2 = new Date(dateB).getTime();
  if (time1 < time2) {
   return  -1; 
  } else if (time1 === time2) {
    return 0;
  } 
  return 1;
}

export function getColourCodeByAccount(account: string) {
  if (account.includes("TFSA")) {
    return "#5f5c97";
  } else if (account.includes("RRSP")) {
    return "#6c69ac";
  } else {
    return "#aba8e3";
  }
}

export function formatDecimalTwoPlaces(num: number) {
  return Math.round(num*100)/100;
}

export function formatNumberAsCurrency(num: number | undefined, includeDollarSign: boolean = true) {
  if (!num) {
    return "-";
  }
  return (includeDollarSign ? "$" : "") + num.toFixed(2);
}