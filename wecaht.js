// ==UserScript==
// @name 微信历史文章
// @namespace chuanbei32
// @version 0.1.1
// @description 微信历史文章
// @author chuanbei32
// @iconURL
// @updateURL https://raw.githubusercontent.com/chuanbei32/wechat_history_script/main/wecaht.js
// @match *://mp.weixin.qq.com/mp/profile_ext*
// @grant GM_xmlhttpRequest
// @grant unsafeWindow
// @require https://cdn.bootcdn.net/ajax/libs/jquery/3.5.1/jquery.min.js
// @require https://cdn.bootcdn.net/ajax/libs/axios/0.21.0/axios.min.js
// ==/UserScript==


(function() {
    'use strict';

    function init() {
        const body_ele = document.getElementsByTagName('body')[0];
        body_ele.insertAdjacentHTML('afterbegin', `
	        <style>
	        .exportFixedPos {
	            z-index: 10;
	            width: 200px;
	            position: fixed;
	            top:0px;
	            right:0px;
			    text-align: right;
			        padding-right: 10px;	
	        }
	        .exportButton {
	            background-color: #4CAF50;
	            border: none;
	            color: white;
	            padding: 10px 12px;
	            text-align: center;
	            text-decoration: none;
	            display: inline-block;
	            font-size: 14px;
	            margin: 4px 2px;
	            cursor: pointer;
	            width: 98px;
	        }
	        .exportButton:disabled, .exportButton[disabled]{
	            border: 1px solid #999999;
	            background-color: #cccccc;
	            color: #666666;
	        }
	        </style>
	        <div class="exportFixedPos" id="exportMainId">
	            <div class="exportHeadClass" id="exportHeadId">
	                <button class="exportButton" id="exportStartPauseButton"> 开启或停止 </button>
	                <button class="exportButton" id="exportCsvButton"> 导出到 CSV </button>
	                <button class="exportButton" id="enableClickButton"> 新标签打开 </button>
	            </div>
	        </div>
	    `);
	}

    let is_running = false;
    function start_or_pause() {
        if (is_running === true) {
            is_running = false;
        } else {
            is_running = true;
            scroll();
        }
    }

    function disable_and_change(button_id, new_text=null) {
        const button_ele = document.getElementById(button_id);
        button_ele.disabled = true;
        if (new_text !== null) {
            button_ele.innerText = new_text;
        }
    }

    function enable_click() {
        enable_click_internal();
        disable_and_change("enableClickButton");
    }

    function enable_click_internal() {
        console.log("enable click from wechat export");
        const h4s = document.getElementsByTagName("h4");
        for (let i=0, len=h4s.length; i<len; i++) {
            h4s[i].addEventListener("click", function(event) {
                event.stopPropagation();
                window.open(this.getAttribute("hrefs"));
            })
        }

        const es = getElementsByXpath("//div[@class='weui_msg_card js_card']");
        for (let index in es) {
            const cards = es[index];
            cards.addEventListener("click", function(event) {
                event.stopPropagation();
            })
        }

        const xx = getElementsByXpath("//div[@class='weui_media_box appmsg js_appmsg']");
        for (let index in xx) {
            const ele = xx[index];
            ele.addEventListener("click", function(event) {
                event.stopPropagation();
                let div = this.querySelector(".weui_media_title");
                let link = div.getAttribute("hrefs");
                window.open(link);
            })
        }
    }
function is_element_hiden(ele) {
    let style = window.getComputedStyle(ele);
    return (style.display === 'none');
}
    function is_page_end() {
        const e = document.getElementsByClassName("tips js_no_more_msg");
        if ((e.length == 1) && (!is_element_hiden(e[0]))) {
            console.log("IsPageEnd? Yes.");
            return true;
        }
        else {
            console.log("IsPageEnd? No.");
            return false;
        }
    }

    function export_page(export_type) {
        console.log("export as " + export_type);
        if (!is_page_end()) {
            let continue_export = confirm("还没有拉到最底部，导出的数据可能不全，是否现在导出？");
            if (!continue_export) return;
        }
    }

    function export_as_csv() {
        export_page("csv");
        make_csv();
    }

    function scroll() {
        $('#js_history_list').animate({scrollTop: window.scrollTo(0, document.body.scrollHeight)}, 200)
        setTimeout(function(){scroll()}, Math.random() * (0.5 - 0.2 + 1) + 0.2 * 200);
    }

    function extract_item(card) {
        // 重点参考 official\profile_history_v2.html.js 模板
         // 初期只考虑最简单的：文字、图片、普通图文，但 CSV 导出和 PDF 一定要加
         let pub_date = card.querySelector(".weui_msg_card_hd").innerText;
        if (card.querySelector(".weui_msg_card_bd") !== null) {
            let elements = card.getElementsByClassName("weui_media_box text js_appmsg");
            if (elements.length != 0) {
                // text
                let card_type = "文字";
                let text = elements[0].querySelector(".weui_media_bd").textContent;
                return [{"date": pub_date, "card_type":card_type, "text":text, "count":1, "id":1}];
            }
            elements = card.getElementsByClassName("weui_media_box appmsg img js_appmsg");
            if (elements.length != 0) {
                let card_type = "图片分享页";
                let img_article_url = elements[0].getAttribute("hrefs");
                return [{"date": pub_date, "card_type":card_type, "text":img_article_url, "count":1, "id":1}];
            }
            elements = card.getElementsByClassName("weui_media_box appmsg js_video video_msg");
            if (elements.length != 0) {
                let card_type = "视频分享页";
                let video_article_url = elements[0].getAttribute("hrefs");
                return [{"date": pub_date, "card_type":card_type, "text":video_article_url, "count":1, "id":1}];
            }
            elements = card.getElementsByClassName("weui_media_box img js_appmsg");
            if (elements.length != 0) {
                // image
                let card_type = "图片";
                let the_div = elements[0].querySelector(".weui_media_bd");
                let the_img = the_div.getElementsByTagName("img")[0];
                let img_url = the_img.getAttribute("src");
                return [{"date": pub_date, "card_type":card_type, "text":img_url, "count":1, "id":1}];
            }
            elements = card.getElementsByClassName("weui_media_box appmsg js_appmsg");
            if (elements.length != 0) {
                let card_type = "图文";
                let infos = [];
                let id = 0;
                for (let ele of elements) {
                    let article_info = {};
                    let dom_title = ele.querySelector(".weui_media_title");
                    let href = dom_title.getAttribute("hrefs");
                    let title = dom_title.innerText;
                    let desc_text = ele.querySelector(".weui_media_desc").innerText;
                    article_info = {
                        "date": pub_date,
                        "card_type": card_type,
                        "title": title,
                        "href": href,
                        "count": elements.length,
                        "text": desc_text,
                        "id": ++id
                    };
                    infos.push(article_info);
                }
                // console.log(`${pub_date}: [${title}] - ${href}`);
                if (infos.length === 0) {
                    return null;
                }
                return infos;
            }
            console.log(`${pub_date}: Error Not Found - ${card}`);
            return null;
        } else {
            console.log(`${pub_date}: Error Unknown - ${card}`);
            return null;
        }
    }
    function getElementsByXpath(xpathToExecute) {
        let result = [];
        let nodesSnapshot = document.evaluate(xpathToExecute, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
            result.push(nodesSnapshot.snapshotItem(i));
        }
        return result;
    }
    function get_history_info() {
        const es = getElementsByXpath("//div[@class='weui_msg_card js_card']");
        let all_info = [];
        for (let index in es) {
            const cards = es[index];
            const msgid = cards.getAttribute("msgid");
            const msg_date = cards.querySelector(".weui_msg_card_hd").innerText;
            // console.log("Extracting " + index.toString() + ": " + msgid + " - " + msg_date);
            try {
                let extracted_info = extract_item(cards);
                if (extracted_info !== null) {
                    // console.log(extracted_info[0]["count"]);
                    all_info.push(extracted_info);
                }
            } catch (error) {
                console.error(error)
            }
        }
        const flat_info = all_info.flat();
        return flat_info;
    }
    function make_csv() {
        function row2str(row_dict) {
            let d = row_dict;
            return `${d["date"]},${d["card_type"]},${d["id"]}/${d["count"]},"${d["title"]||""}"}","${d["href"]||""}"`;
        }
        // let header = "date,card_type,id_count,title,text,href";
        let header = "date,card_type,id_count,title,href";

        let data = get_history_info();
        // [A way to generate and download CSV files client-side · Issue #175 · mholt/PapaParse](https://github.com/mholt/PapaParse/issues/175#issuecomment-201308792)
        // [How to export JavaScript array info to csv (on client side)? - Stack Overflow](https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side)
        let csv = header + "\n" + data.map(row => row2str(row)).join("\n");

        var date = new Date(Math.round(new Date().getTime()));
Y = date.getFullYear() + '-';
M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
D = date.getDate() + ' ';
h = date.getHours() + ':';
m = date.getMinutes() + ':';
s = date.getSeconds(); 

        let exportFilename = $('#nickname').html() + " " + Y + M + D + h + m + s + ".csv";
        let csvData = new Blob(["\ufeff" + csv], {type: 'text/csv;charset=utf-8;'});
        //IE11 & Edge
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(csvData, exportFilename);
        } else {
            //In FF link must be added to DOM to be clicked
            let link = document.createElement('a');
            link.href = window.URL.createObjectURL(csvData);
            link.setAttribute('download', exportFilename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }


    $(function () {
		init();
		$(document).on('click', '#exportStartPauseButton', start_or_pause);
		$(document).on('click', '#exportCsvButton', export_as_csv);
		$(document).on('click', '#enableClickButton', enable_click);
    });
})();
