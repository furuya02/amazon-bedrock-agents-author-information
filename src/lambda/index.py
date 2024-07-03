import json
import urllib.request
import chardet
from bs4 import BeautifulSoup


def get_html_from_url(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as res:
        body = res.read()

    chardet_result = chardet.detect(body)
    encoding = chardet_result["encoding"]

    html_doc = body.decode(encoding)
    return BeautifulSoup(html_doc, "html.parser")


def get_article_info(post):

    title = post.find(
        "p", class_="text-sm text-gray-500 group-hover:text-blue-700 break-all"
    ).text.strip()

    # 新DevIOの著者ページでは、投稿日の文字列がゼロパテでィングされていないため、実装で対応する
    date = post.find("span", class_="text-xs text-gray-500").text.strip()
    tmp = date.split(".")
    date = "{}.{}.{}".format(tmp[0].zfill(2), tmp[1].zfill(2), tmp[2])

    # 新DevIOの著者ページでは、シェア数の情報が取得できないため、shareを廃止

    return {
        "title": title,
        "date": date,
    }


def get_articles(url: str) -> str:
    soup = get_html_from_url(url)
    dom = soup.find("body")

    articles = []
    for post in dom.find_all("div", class_="flex flex-col bg-white rounded"):
        articles.append(get_article_info(post))

    return articles


def handler(event, _context):
    print(event)

    action_group = event["actionGroup"]
    function = event["function"]

    user = ""
    if function == "get_articles":
        properties = event["parameters"]
        for item in properties:
            if item["name"] == "user":
                user = item["value"]

    articles = []
    if user:
        url = "https://dev.classmethod.jp/author/{}/".format(user)
        articles = get_articles(url)

    response = {
        "actionGroup": action_group,
        "function": function,
        "functionResponse": {
            "responseBody": {
                "TEXT": {"body": json.dumps({"articles": articles}, ensure_ascii=False)}
            },
        },
    }

    api_response = {"messageVersion": "1.0", "response": response}
    print(api_response)
    return api_response
