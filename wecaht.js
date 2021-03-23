




// ==UserScript==
// @name 微信历史文章
// @namespace chuanbei32
// @version 0.0.1
// @description 微信历史文章
// @author chuanbei32
// @iconURL
// @updateURL wecaht
// @match *://aladdin2.baidu.com/*
// @grant GM_xmlhttpRequest
// @grant unsafeWindow
// @require https://cdn.bootcdn.net/ajax/libs/jquery/3.5.1/jquery.min.js
// @require https://cdn.bootcdn.net/ajax/libs/axios/0.21.0/axios.min.js
// ==/UserScript==



(function() {
    'use strict';
function init() {
    var body_ele = document.getElementsByTagName('body')[0];
    body_ele.insertAdjacentHTML('afterbegin', `
        <style>
        .exportFixedPos {
            z-index: 10;
            width: 200px;
            position: fixed;
            top:0px;
            right:0px;
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
        }
        .exportButton:disabled, .exportButton[disabled]{
            border: 1px solid #999999;
            background-color: #cccccc;
            color: #666666;
        }
        </style>
        <div class="exportFixedPos" id="exportMainId">
            <div class="exportHeadClass" id="exportHeadId">
                <button class="exportButton" id="exportStartPauseButton" onclick=start_or_pause()>开启/停止</button>
                <button class="exportButton" id="exportCsvButton" onclick=export_as_csv()>导出到CSV</button>
                <button class="exportButton" id="enableClickButton" onclick=enable_click()>新标签打开</button>
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
    var button_ele = document.getElementById(button_id);
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
    h4s = document.getElementsByTagName("h4");
    for (i=0, len=h4s.length; i<len; i++) {
        h4s[i].addEventListener("click", function(event) {
            event.stopPropagation();
            window.open(this.getAttribute("hrefs"));
        })    
    }
    
    es = getElementsByXpath("//div[@class='weui_msg_card js_card']");
    for (var index in es) {
        cards = es[index];
        cards.addEventListener("click", function(event) {
            event.stopPropagation();
        })
    }

    xx = getElementsByXpath("//div[@class='weui_media_box appmsg js_appmsg']");
    for (var index in xx) {
        ele = xx[index];
        ele.addEventListener("click", function(event) {
            event.stopPropagation();
            var div = this.querySelector(".weui_media_title");
            var link = div.getAttribute("hrefs");
            window.open(link);
        })
    }
}

function is_page_end() {
    e = document.getElementsByClassName("tips js_no_more_msg");
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
        var continue_export = confirm("还没有拉到最底部，导出的数据可能不全，是否现在导出？");
        if (!continue_export)  return;
    }
}

function export_as_csv() {
    export_page("csv");
    make_csv();
}

function scroll() {
	$('#js_history_list').animate({scrollTop: window.scrollTo(0, document.body.scrollHeight)}, 200)
    setTimeout(function(){scroll()},  Math.random() * (0.5 - 0.2 + 1) + 0.2 * 200);
}

function extract_item(card) {
    // 重点参考 official\profile_history_v2.html.js 模板
    // 初期只考虑最简单的：文字、图片、普通图文，但CSV导出和PDF一定要加
    var pub_date = card.querySelector(".weui_msg_card_hd").innerText;
    if (card.querySelector(".weui_msg_card_bd") !== null) {
        var elements = card.getElementsByClassName("weui_media_box text js_appmsg");
        if (elements.length != 0) {
            // text
            var card_type = "文字";
            var text = elements[0].querySelector(".weui_media_bd").textContent;
            return [{"date": pub_date, "card_type":card_type, "text":text, "count":1, "id":1}];
        }
        var elements = card.getElementsByClassName("weui_media_box appmsg img js_appmsg");
        if (elements.length != 0) {
            var card_type = "图片分享页";
            var img_article_url = elements[0].getAttribute("hrefs");
            return [{"date": pub_date, "card_type":card_type, "text":img_article_url, "count":1, "id":1}];
        }
        var elements = card.getElementsByClassName("weui_media_box appmsg js_video video_msg");
        if (elements.length != 0) {
            var card_type = "视频分享页";
            var video_article_url = elements[0].getAttribute("hrefs");
            return [{"date": pub_date, "card_type":card_type, "text":video_article_url, "count":1, "id":1}];
        }
        var elements = card.getElementsByClassName("weui_media_box img js_appmsg");
        if (elements.length != 0) {
            // image
            var card_type = "图片";
            var the_div = elements[0].querySelector(".weui_media_bd");
            var the_img = the_div.getElementsByTagName("img")[0];
            var img_url = the_img.getAttribute("src");
            return [{"date": pub_date, "card_type":card_type, "text":img_url, "count":1, "id":1}];
        }
        var elements = card.getElementsByClassName("weui_media_box appmsg js_appmsg");
        if (elements.length != 0) {
            var card_type = "图文";
            var infos = [];
            var id = 0;
            for (let ele of elements) {
                var article_info = {};
                var dom_title = ele.querySelector(".weui_media_title");
                var href = dom_title.getAttribute("hrefs");
                var title = dom_title.innerText;
                var desc_text = ele.querySelector(".weui_media_desc").innerText;
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
    var result = [];
    var nodesSnapshot = document.evaluate(xpathToExecute, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0; i < nodesSnapshot.snapshotLength; i++) {
        result.push(nodesSnapshot.snapshotItem(i));
    }
    return result;
}
function get_history_info() {
    es = getElementsByXpath("//div[@class='weui_msg_card js_card']");
    all_info = [];
    for (var index in es) {
        cards = es[index];
        msgid = cards.getAttribute("msgid");
        msg_date = cards.querySelector(".weui_msg_card_hd").innerText;
        // console.log("Extracting " + index.toString() + ": " + msgid + " - " + msg_date);
        try {
            var extracted_info = extract_item(cards);
            if (extracted_info !== null) {
                // console.log(extracted_info[0]["count"]);
                all_info.push(extracted_info);
            }
        } catch (error) {
            console.error(error)
        }
    }
    flat_info = all_info.flat();
    return flat_info;
}
function make_csv() {
    function row2str(row_dict) {
        var d = row_dict;
        return `${d['date']},${d["card_type"]},${d["id"]}/${d["count"]},"${d["title"]||""}","${d["text"]||""}","${d["href"]||""}"`;
    }
    var header = "date,card_type,id_count,title,text,href";

    var data = get_history_info();
    // [A way to generate and download CSV files client-side · Issue #175 · mholt/PapaParse](https://github.com/mholt/PapaParse/issues/175#issuecomment-201308792)
    // [How to export JavaScript array info to csv (on client side)? - Stack Overflow](https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side)
    var csv = header + "\n" + data.map(row => row2str(row)).join("\n");
    var exportFilename = "HistoryExport.csv";
    var csvData = new Blob(["\ufeff" + csv], {type: 'text/csv;charset=utf-8;'});
    //IE11 & Edge
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(csvData, exportFilename);
    } else {
        //In FF link must be added to DOM to be clicked
        var link = document.createElement('a');
        link.href = window.URL.createObjectURL(csvData);
        link.setAttribute('download', exportFilename);
        document.body.appendChild(link);    
        link.click();
        document.body.removeChild(link);    
    }    
}

   

    var injquery = document.createElement('script');
    injquery.setAttribute("src","https://cdn.bootcdn.net/ajax/libs/jquery/3.5.1/jquery.min.js");
    document.body.appendChild(injquery);

    var inaxios = document.createElement('script');
    inaxios.setAttribute("src","https://cdn.bootcdn.net/ajax/libs/axios/0.21.0/axios.min.js");
    document.body.appendChild(inaxios);

   
})();
