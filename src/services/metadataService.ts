export interface ExternalBook {
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  isbn?: string;
  genre?: string[];
  publishedDate?: string;
  language?: string;
  pageCount?: number;
  source: string;
}

export const metadataService = {
  async searchGoogleBooks(query: string): Promise<ExternalBook[]> {
    try {
      // Increased maxResults to 10
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`);
      const data = await response.json();
      
      if (!data.items) return [];

      return data.items.map((item: any) => {
        const info = item.volumeInfo;
        return {
          title: info.title,
          authors: info.authors || [],
          description: info.description,
          coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:'),
          isbn: info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || info.industryIdentifiers?.[0]?.identifier,
          genre: info.categories || [],
          publishedDate: info.publishedDate,
          language: info.language,
          pageCount: info.pageCount,
          source: 'Google Books'
        };
      });
    } catch (error) {
      console.error('Error fetching from Google Books:', error);
      return [];
    }
  },

  async searchOpenLibrary(query: string): Promise<ExternalBook[]> {
    try {
      // Increased limit to 10
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      
      if (!data.docs) return [];

      return data.docs.map((doc: any) => ({
        title: doc.title,
        authors: doc.author_name || [],
        description: '', // Open Library search doesn't return full description directly
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
        isbn: doc.isbn?.[0],
        genre: doc.subject || [],
        publishedDate: doc.first_publish_year?.toString(),
        language: doc.language?.[0],
        pageCount: doc.number_of_pages_median || doc.number_of_pages,
        source: 'Open Library'
      }));
    } catch (error) {
      console.error('Error fetching from Open Library:', error);
      return [];
    }
  },

  async searchBooks(query: string): Promise<ExternalBook[]> {
    const [googleResults, openLibraryResults] = await Promise.all([
      this.searchGoogleBooks(query),
      this.searchOpenLibrary(query)
    ]);

    // Combine and remove exact duplicates (by title and first author)
    const combined = [...googleResults, ...openLibraryResults];
    const seen = new Set<string>();
    
    return combined.filter(book => {
      const key = `${book.title.toLowerCase().trim()}-${(book.authors[0] || '').toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
};
