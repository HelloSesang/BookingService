// 예약 내역 정보를 요청하는 클래스
function DataRequest() {
	this.methodType = "GET";
	this.requestURI = "/api/reservations?";
	this.reservationEmailParam = "";
}

// DataRequest 전체 프로세스 진행 메소드
DataRequest.prototype.executeProcess = function() {
	this.getAPIParam();
	this.callSendRequest();
};

// 파라미터 정보를 가져오는 메소드
DataRequest.prototype.getAPIParam = function() {
	const paramRegExp = /reservationEmail=.+/;
	const queryString = window.location.search;
	this.reservationEmailParam = decodeURIComponent(paramRegExp.exec(queryString));
};

// 서버로의 요청을 RequestSender에게 전달하는 메소드
DataRequest.prototype.callSendRequest = function() {
	const requestSender = new RequestSender(this, this.methodType, this.requestURI + this.reservationEmailParam, null, this.responseHandler);
	requestSender.sendRequest();
};

// 서버에서 온 응답을 처리하는 메소드
DataRequest.prototype.responseHandler = function(xhr) {
	const response = JSON.parse(xhr.responseText);
	if (response.size === 0) {
		document.querySelector(".err").style.display = "block";
		return;
	}
	new TopMenu(response).executeProcess();
	new ConfirmedItem(response).executeProcess();
	new UsedItem(response).executeProcess();
	new CanceledItem(response).executeProcess();
};

// 화면 상단 전체 요약 정보를 담당하는 클래스
function TopMenu(response) {
	this.response = response;
}

// TopMenu 전체 프로세스 진행 메소드
TopMenu.prototype.executeProcess = function() {
	this.setEmailInfo();
	this.printSummaryInfo();
};

// 상단 메뉴 이메일 정보 출력 메소드
TopMenu.prototype.setEmailInfo = function() {
	const paramRegExp = /reservationEmail=(.+)/;
	const queryString = window.location.search;
	const reservationEmail = decodeURIComponent(paramRegExp.exec(queryString)[1]);
	const emailElement = document.querySelector(".viewReservation");
	emailElement.textContent = reservationEmail;
};

// 예약 내역에 대한 요약 정보를 출력하는 메소드
TopMenu.prototype.printSummaryInfo = function() {
	const elements = document.querySelectorAll(".link_summary_board .figure");
	const totalCntElem = elements.item(0);
	const confirmedCntElem = elements.item(1);
	const usedCntElem = elements.item(2);
	const canceledCntElem = elements.item(3);
	let confirmedCount = 0;
	let usedCount = 0;
	let canceledCount = 0;
	for (let item of this.response.reservationInfos) {
		if (item.cancelYn) {
			canceledCount++;
		} else {
			confirmedCount++;
		}
	}
	totalCntElem.textContent = this.response.size;
	confirmedCntElem.textContent = confirmedCount;
	usedCntElem.textContent = usedCount;
	canceledCntElem.textContent = canceledCount;
};

// 예약 확정 내역을 담당하는 클래스
function ConfirmedItem(response) {
	this.response = response;
}

// ConfirmedItem 전체 프로세스 진행 메소드
ConfirmedItem.prototype.executeProcess = function() {
	this.methodType = "PUT";
	this.requestURI = "/api/reservations/";
	this.params = null;
	this.cancelItem = null;
	this.addItems();
	this.setCancelBtnListener();
	this.setConfirmPopupListener();
};

// 예약 확정 아이템을 화면에 추가하는 메소드
ConfirmedItem.prototype.addItems = function() {
	const template = document.querySelector("#confirmed-reservation-template").textContent;
	const bindTemplate = Handlebars.compile(template);
	const addLocation = document.querySelector(".card.confirmed");
	for(let item of this.response.reservationInfos) {
		if (!item.cancelYn) {
			const data = {
				reservationInfoId: "No." + String(item.reservationInfoId).padStart(7, '0'),
				productDescription: item.displayInfo.productDescription,
				placeName: item.displayInfo.placeName,
				totalPrice: Number(item.totalPrice).toLocaleString('en'),
				reservationDate: item.reservationDate.substring(0, 10).replace(/-/g, ".")
			};
			const resultHTML = bindTemplate(data);
			addLocation.insertAdjacentHTML("beforeend", resultHTML);
		}
	}
};

// 취소 버튼 이벤트리스너 설정 메소드
ConfirmedItem.prototype.setCancelBtnListener = function() {
	const confirmedList = document.querySelector(".card.confirmed");
	const cancelPopup = document.querySelector(".popup_booking_wrapper");
	confirmedList.addEventListener("click", (e) => {
		if (e.target.tagName === "BUTTON" || (e.target.tagName === "SPAN" && e.target.parentElement.tagName === "BUTTON")) {
			this.cancelItem = e.target.closest(".card_item");
			cancelPopup.querySelector(".pop_tit").firstElementChild.textContent = this.cancelItem.querySelector(".tit").textContent;
			cancelPopup.querySelector(".pop_tit").lastElementChild.textContent = this.cancelItem.querySelector(".item:first-child .item_dsc").textContent;
			cancelPopup.style.display = "block";
		}
	});
};

// 취소 팝업 이벤트 리스너 설정 메소드
ConfirmedItem.prototype.setConfirmPopupListener = function() {
	const cancelPopup = document.querySelector(".popup_booking_wrapper");
	const confirmedCount = document.querySelectorAll(".link_summary_board > .figure").item(1);
	cancelPopup.addEventListener("click", (e) => {
		if (e.target.closest(".btn_gray") || e.target.closest(".popup_btn_close")) {
			cancelPopup.style.display = "none";
		}
		if (e.target.closest(".btn_green")) {
			this.canceledRsvId = parseInt(this.cancelItem.querySelector(".booking_number").textContent.substring(3));
			this.canceledDesc = this.cancelItem.querySelector(".tit").textContent;
			this.canceledPlace = this.cancelItem.querySelector(".item:nth-child(3) .item_dsc").textContent;
			this.canceledPrice = this.cancelItem.querySelector(".price_amount").firstElementChild.textContent;
			const requestSender = new RequestSender(this, this.methodType, this.requestURI + this.canceledRsvId, this.params, this.responseHandler);
			requestSender.sendRequest();
			confirmedCount.textContent = parseInt(confirmedCount.textContent) - 1;
			this.cancelItem.remove();
			cancelPopup.style.display = "none";
		}
	});
};

// 예약 취소에 대한 응답 처리 메소드
ConfirmedItem.prototype.responseHandler = function(xhr, client) {
	const response = JSON.parse(xhr.responseText);
	const canceledCntElem = document.querySelectorAll(".link_summary_board .figure").item(3);
	const template = document.querySelector("#canceled-reservation-template").textContent;
	const bindTemplate = Handlebars.compile(template);
	const addLocation = document.querySelector(".card.used.cancel");
	const data = {
		reservationInfoId: "No." + String(client.canceledRsvId).padStart(7, '0'),
		productDescription: client.canceledDesc,
		placeName: client.canceledPlace,
		totalPrice: client.canceledPrice
	};
	const resultHTML = bindTemplate(data);
	addLocation.insertAdjacentHTML("beforeend", resultHTML);
	canceledCntElem.textContent = parseInt(canceledCntElem.textContent) + 1;
};

// 이용 완료 내역을 담당하는 클래스
function UsedItem(response) {
	this.response = response;
}

// UsedItem 전체 프로세스 진행 메소드
UsedItem.prototype.executeProcess = function() {
	this.addItems();
};

// 이용 완료 내역을 화면에 출력하는 메소드
UsedItem.prototype.addItems = function() {
	const template = document.querySelector("#used-reservation-template").textContent;
	const bindTemplate = Handlebars.compile(template);
	const addLocation = document.querySelector(".card.used");
	for(let item of this.response.reservationInfos) {
		if (!item.cancelYn) {
			const data = {
				reservationInfoId: "No." + String(item.reservationInfoId).padStart(7, '0'),
				productDescription: item.displayInfo.productDescription,
				placeName: item.displayInfo.placeName,
				totalPrice: Number(item.totalPrice).toLocaleString('en'),
				displayInfoId: item.displayInfo.displayInfoId,
				reservationInfoIdParam: item.reservationInfoId,
				reservationEmail: item.reservationEmail,
				reservationDate: item.reservationDate.substring(0, 10).replace(/-/g, ".")
			};
			const resultHTML = bindTemplate(data);
			addLocation.insertAdjacentHTML("beforeend", resultHTML);
		}
	}
};

// 취소된 내역을 담당하는 클래스
function CanceledItem(response) {
	this.response = response;
}

// CanceledItem 전체 프로세스 진행 메소드
CanceledItem.prototype.executeProcess = function() {
	this.addItems();
};

// 취소된 내역을 화면에 출력하는 메소드
CanceledItem.prototype.addItems = function() {
	const template = document.querySelector("#canceled-reservation-template").textContent;
	const bindTemplate = Handlebars.compile(template);
	const addLocation = document.querySelector(".card.used.cancel");
	for(let item of this.response.reservationInfos) {
		if (item.cancelYn) {
			const data = {
				reservationInfoId: "No." + String(item.reservationInfoId).padStart(7, '0'),
				productDescription: item.displayInfo.productDescription,
				placeName: item.displayInfo.placeName,
				totalPrice: Number(item.totalPrice).toLocaleString('en'),
				reservationDate: item.reservationDate.substring(0, 10).replace(/-/g, ".")
			};
			const resultHTML = bindTemplate(data);
			addLocation.insertAdjacentHTML("beforeend", resultHTML);
		}
	}
};

// 메인 함수
document.addEventListener("DOMContentLoaded", () => {
	new DataRequest().executeProcess();
});