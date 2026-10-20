// Index of a book picked by its weight, the way the RGS picks rounds from the lookup table.
export const pickByWeight = (books: { weight: number }[]) => {
	const total = books.reduce((sum, book) => sum + book.weight, 0);
	let roll = Math.random() * total;
	const index = books.findIndex((book) => (roll -= book.weight) < 0);
	// float rounding can leave a sliver past the last book
	return index === -1 ? books.length - 1 : index;
};
