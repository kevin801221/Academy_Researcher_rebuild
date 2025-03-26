from bs4 import BeautifulSoup
from urllib.parse import urljoin

from ..utils import get_relevant_images, extract_title, get_text_from_soup, clean_soup


class BeautifulSoupScraper:

    def __init__(self, link, session=None):
        self.link = link
        self.session = session

    def scrape(self):
        """
        This function scrapes content from a webpage by making a GET request, parsing the HTML using
        BeautifulSoup, and extracting script and style elements before returning the cleaned content.

        Returns:
          The `scrape` method is returning the cleaned and extracted content from the webpage specified
        by the `self.link` attribute. The method fetches the webpage content, removes script and style
        tags, extracts the text content, and returns the cleaned content as a string. If any exception
        occurs during the process, an error message is printed and an empty string is returned.
        """
        try:
            response = self.session.get(self.link, timeout=4)

            # 強制使用 UTF-8 編碼，或嘗試從 HTTP 頭部獲取正確的編碼
            if "charset" in response.headers.get("content-type", "").lower():
                encoding = response.encoding
            else:
                # 嘗試檢測編碼，如果無法檢測則使用 UTF-8
                encoding = response.apparent_encoding or "utf-8"

            # 使用檢測到的編碼重新解碼內容
            response.encoding = encoding

            soup = BeautifulSoup(response.text, "lxml")

            soup = clean_soup(soup)

            content = get_text_from_soup(soup)

            image_urls = get_relevant_images(soup, self.link)

            # Extract the title using the utility function
            title = extract_title(soup)

            return content, image_urls, title

        except Exception as e:
            print("Error! : " + str(e))
            return "", [], ""
