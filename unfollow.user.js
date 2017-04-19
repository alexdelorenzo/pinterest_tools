// ==UserScript==
// @name         Pinterest Autounfollow
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatically Unfollow Followed Pinterest Users
// @author       Alex
// @match        https://www.pinterest.com/*/following
// @match        https://www.pinterest.com/*/following/*
// @require      http://code.jquery.com/jquery-latest.js
// @grant        none
// ==/UserScript==

'use strict';


const SECOND = 1000;  // 1 second = 1000 milliseconds
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const RATE_LIMIT_TIMEOUT = 10 * MINUTE;
const PAGE_LOAD_TIMEOUT = 4.5 * SECOND;
const UNFOLLOW_TIMEOUT = 0.81 * SECOND;

const UNFOLLOW_COUNT = 180;

const BTN_HTML = "<button />"
const BTN_ID = "unfollow_all";
const BTN_DEFAULT = "Unfollow All";
const ATTACH_BTN_TO = "div.headerContainer";


function update_button(text) {
    $(`#${BTN_ID}`).text(text);
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function is_rate_limit_hit() {
    const confirm_dialog = $(".ConfirmDialog");

    return confirm_dialog ? confirm_dialog.length !== 0 : false;
}


function get_followed() {
    const btns = $("button.antialiased").toArray();

    return btns.filter(btn => btn.textContent.includes("Unfollow"));
}


function auto_scroll () {
    $(window).scrollTop($(document).height());
}

async function btn_sleep(timeout) {
    const old_text = $(`#${BTN_ID}`).text();
    update_button(`Sleeping for ${timeout}ms...`);
    await sleep(timeout)
    update_button(old_text);
}


async function unfollow(followed) {
    for (const follower of followed) {
        update_button("Unfollowing users...");

        if (!is_rate_limit_hit()) {
            $(follower).scrollTop(0);
            follower.click();

            await sleep(UNFOLLOW_TIMEOUT);
        }

        else {
            await btn_sleep(PAGE_LOAD_TIMEOUT);

            $(".ConfirmDialog button").click();

            update_button("Rate limit reached while unfollowing. Sleeping for 1hr...");
            await sleep(RATE_LIMIT_TIMEOUT);
        }
    }
}


async function build_follow_array() {
    const followers = [];

    while (followers.length < UNFOLLOW_COUNT) {
        followers.push(...get_followed());
        update_button(`Building array of unfollowed users (${followers.length} of ${UNFOLLOW_COUNT}). Please wait...`)
        auto_scroll();

        console.log("Waiting "+ PAGE_LOAD_TIMEOUT +"...");
        await sleep(PAGE_LOAD_TIMEOUT);
    }

    return followers.slice(0, UNFOLLOW_COUNT);
}


async function scroll_unfollow() {
    while (true) {
        const followed = await build_follow_array();
        await unfollow(followed);

        update_button(`Unfollowed ${followed.length} users. Sleeping for 1hr...`);
        await sleep(RATE_LIMIT_TIMEOUT);
    }
}


function build_btn() {
    const btn = $(BTN_HTML,
                  {text: BTN_DEFAULT,
                   id: BTN_ID,
                   type: "button",
                   click: scroll_unfollow});

    $( document ).ready(function() {
        $(ATTACH_BTN_TO).append(btn);
        btn.show();
    });
}


build_btn();
