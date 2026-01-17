const tabs = document.querySelectorAll('.tab');
const chipList = document.querySelector('#chipList');
const featuredList = document.querySelector('#featuredList');
const featuredPrev = document.querySelector('#featuredPrev');
const featuredNext = document.querySelector('#featuredNext');
const productList = document.querySelector('#productList');
const searchInput = document.querySelector('#searchInput');
const profileName = document.querySelector('#profileName');
const profileNameText = document.querySelector('#profileNameText');
const profileDesc = document.querySelector('#profileDesc');
const profileCard = document.querySelector('#profile');
const badgeList = document.querySelector('#badgeList');
const avatar = document.querySelector('#avatar');
const productForm = document.querySelector('#productForm');
const productNameInput = document.querySelector('#productName');
const productCategoryInput = document.querySelector('#productCategory');
const productImageInput = document.querySelector('#productImage');
const productLinkInput = document.querySelector('#productLink');
const productIdInput = document.querySelector('#productId');
const productSubmit = document.querySelector('#productSubmit');
const adminList = document.querySelector('#adminList');
const featuredForm = document.querySelector('#featuredForm');
const featuredProductSearch = document.querySelector('#featuredProductSearch');
const featuredProductOptions = document.querySelector('#featuredProductOptions');
const featuredProductId = document.querySelector('#featuredProductId');
const featuredAdminList = document.querySelector('#featuredAdminList');
const adminSections = document.querySelectorAll('.admin-section');
const adminLoginOverlay = document.querySelector('#loginOverlay');
const adminLoginForm = document.querySelector('#adminLoginForm');
const adminUser = document.querySelector('#adminUser');
const adminPass = document.querySelector('#adminPass');
const adminLoginMessage = document.querySelector('#adminLoginMessage');
const profileAdminForm = document.querySelector('#profileAdminForm');
const profileAdminName = document.querySelector('#profileAdminName');
const profileAdminDesc = document.querySelector('#profileAdminDesc');
const profileAdminAvatar = document.querySelector('#profileAdminAvatar');
const categoryForm = document.querySelector('#categoryForm');
const categoryNameInput = document.querySelector('#categoryName');
const categoryIdInput = document.querySelector('#categoryId');
const categorySubmit = document.querySelector('#categorySubmit');
const categoryList = document.querySelector('#categoryList');
const contactForm = document.querySelector('#contactForm');
const contactFacebookInput = document.querySelector('#contactFacebookInput');
const contactInstagramInput = document.querySelector('#contactInstagramInput');
const contactTiktokInput = document.querySelector('#contactTiktokInput');
const contactFacebookLink = document.querySelector('#contactFacebook');
const contactInstagramLink = document.querySelector('#contactInstagram');
const contactTiktokLink = document.querySelector('#contactTiktok');
const toast = document.querySelector('#toast');

let allProducts = [];
let allCategories = [];
let featuredItems = [];
let featuredIndex = 0;
let featuredTimer = null;
let editingProductImageUrl = '';

const setActive = (items, target) => {
	items.forEach((item) => item.classList.remove('active'));
	target.classList.add('active');
};

const setAdminVisible = (visible) => {
	adminSections.forEach((section) => {
		section.classList.toggle('hidden', !visible);
	});
};

const showToast = (message) => {
	if (!toast) return;
	toast.textContent = message;
	toast.classList.add('show');
	setTimeout(() => toast.classList.remove('show'), 1800);
};

const createMedia = (imageUrl) => {
	const media = document.createElement('div');
	media.className = 'media';
	if (imageUrl) {
		media.style.backgroundImage = `url(${imageUrl})`;
	}
	return media;
};

const buildAffiliateLink = (productId, fallback) => {
	if (productId) return `/r/${productId}`;
	return fallback || '';
};

const createMediaLink = (imageUrl, linkUrl) => {
	const wrapper = document.createElement(linkUrl ? 'a' : 'div');
	if (linkUrl) {
		wrapper.href = linkUrl;
		wrapper.target = '_blank';
		wrapper.rel = 'noopener';
	}
	wrapper.className = 'media-link';
	const media = createMedia(imageUrl);
	wrapper.appendChild(media);

	if (linkUrl) {
		const buy = document.createElement('span');
		buy.className = 'buy-btn';
		buy.textContent = 'Mua ngay';
		wrapper.appendChild(buy);
	}

	return wrapper;
};

const renderFeatured = (items) => {
	if (!featuredList) return;
	featuredList.innerHTML = '';
	const track = document.createElement('div');
	track.className = 'slider-track';
	items.forEach((item) => {
		const card = document.createElement('article');
		card.className = 'card';
		const imageUrl = item.product_image || item.image_url;
		const linkUrl = buildAffiliateLink(item.product_id, item.product_link);
		card.appendChild(createMediaLink(imageUrl, linkUrl));

		const meta = document.createElement('div');
		meta.className = 'meta';
		meta.textContent = item.product_name || item.name;
		card.appendChild(meta);

		track.appendChild(card);
	});
	featuredList.appendChild(track);
};

const getFeaturedPerView = () => {
	const width = window.innerWidth;
	if (width <= 640) return 1;
	if (width <= 900) return 2;
	if (width <= 1024) return 3;
	return 4;
};

const updateFeaturedPosition = () => {
	if (!featuredList) return;
	const track = featuredList.querySelector('.slider-track');
	if (!track) return;

	const perView = getFeaturedPerView();
	const maxIndex = Math.max(0, featuredItems.length - perView);
	if (featuredIndex > maxIndex) featuredIndex = 0;

	const card = track.querySelector('.card');
	if (!card) return;

	const cardWidth = card.getBoundingClientRect().width;
	const gap = 14;
	const offset = (cardWidth + gap) * featuredIndex;
	track.style.transform = `translateX(-${offset}px)`;
};

const startFeaturedAuto = () => {
	if (!featuredList) return;
	if (featuredTimer) clearInterval(featuredTimer);
	if (featuredItems.length <= 2) return;
	featuredTimer = setInterval(() => {
		const perView = getFeaturedPerView();
		const maxIndex = Math.max(0, featuredItems.length - perView);
		if (maxIndex === 0) return;
		featuredIndex = featuredIndex >= maxIndex ? 0 : featuredIndex + 1;
		updateFeaturedPosition();
	}, 10000);
};

const renderProducts = (items) => {
	if (!productList) return;
	productList.innerHTML = '';
	items.forEach((item) => {
		const card = document.createElement('article');
		card.className = 'product';
		const linkUrl = buildAffiliateLink(item.id, item.link);
		card.appendChild(createMediaLink(item.image_url, linkUrl));

		const meta = document.createElement('div');
		meta.className = 'meta';
		meta.textContent = item.name;
		card.appendChild(meta);

		productList.appendChild(card);
	});
};

const renderAdminList = (items) => {
	if (!adminList) return;
	adminList.innerHTML = '';
	items.forEach((item) => {
		const row = document.createElement('div');
		row.className = 'admin-item';

		const label = document.createElement('div');
		label.textContent = `${item.name} • ${item.category}`;

		const edit = document.createElement('button');
		edit.type = 'button';
		edit.className = 'admin-edit';
		edit.textContent = 'Sửa';
		edit.addEventListener('click', () => {
			if (!productNameInput || !productCategoryInput || !productLinkInput) return;
			productNameInput.value = item.name;
			productCategoryInput.value = item.category;
			productLinkInput.value = item.link || '';
			if (productIdInput) {
				productIdInput.value = item.id;
			}
			editingProductImageUrl = item.image_url || '';
			if (productSubmit) {
				productSubmit.textContent = 'Cập nhật sản phẩm';
			}
		});

		const del = document.createElement('button');
		del.type = 'button';
		del.className = 'admin-delete';
		del.textContent = 'Xóa';
		del.addEventListener('click', async () => {
			await fetch(`/api/products/${item.id}`, { method: 'DELETE' });
			await loadProducts();
		});

		row.appendChild(label);
		row.appendChild(edit);
		row.appendChild(del);
		adminList.appendChild(row);
	});
};

const renderFeaturedAdminList = (items) => {
	if (!featuredAdminList) return;
	featuredAdminList.innerHTML = '';
	items.forEach((item) => {
		const row = document.createElement('div');
		row.className = 'admin-item';

		const label = document.createElement('div');
		label.textContent = item.product_name || item.name;

		const del = document.createElement('button');
		del.type = 'button';
		del.className = 'admin-delete';
		del.textContent = 'Xóa';
		del.addEventListener('click', async () => {
			await fetch(`/api/featured/${item.id}`, { method: 'DELETE' });
			await loadFeatured();
		});

		row.appendChild(label);
		row.appendChild(del);
		featuredAdminList.appendChild(row);
	});
};

const filterProducts = () => {
	const activeChip = document.querySelector('.chip.active');
	const chipValue = activeChip ? activeChip.dataset.category : 'Tất cả';
	const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';

	const filtered = allProducts.filter((product) => {
		const matchCategory = chipValue === 'Tất cả' || product.category === chipValue;
		const matchName = product.name.toLowerCase().includes(keyword);
		return matchCategory && matchName;
	});

	renderProducts(filtered);
};

tabs.forEach((tab) => {
	tab.addEventListener('click', () => setActive(tabs, tab));
});

if (searchInput) {
	searchInput.addEventListener('input', filterProducts);
}

if (productForm) {
	productForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const name = productNameInput.value.trim();
	const category = productCategoryInput.value.trim();
	const file = productImageInput.files[0];
	const link = productLinkInput ? productLinkInput.value.trim() : '';
	const productId = productIdInput ? productIdInput.value : '';

	if (!name || !category) {
		return;
	}

	const formData = new FormData();
	formData.append('name', name);
	formData.append('category', category);
	formData.append('link', link);
	if (file) {
		formData.append('image', file);
	}

	if (productId) {
		if (!file && editingProductImageUrl) {
			formData.append('image_url', editingProductImageUrl);
		}
		await fetch(`/api/products/${productId}`, {
			method: 'PUT',
			body: formData,
		});
		showToast('Lưu sản phẩm thành công');
	} else {
		await fetch('/api/products', {
			method: 'POST',
			body: formData,
		});
		showToast('Thêm sản phẩm thành công');
	}

	productForm.reset();
	if (productIdInput) productIdInput.value = '';
	editingProductImageUrl = '';
	if (productSubmit) productSubmit.textContent = 'Thêm sản phẩm';
	await loadProducts();
  });
}

if (featuredForm) {
	featuredForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const productId = featuredProductId.value;

	if (!productId) {
		return;
	}

	const formData = new FormData();
	formData.append('product_id', productId);

	await fetch('/api/featured', {
		method: 'POST',
		body: formData,
	});

	featuredForm.reset();
	featuredProductId.value = '';
	showToast('Lưu sản phẩm nổi bật thành công');
	await loadFeatured();
  });
}

if (categoryForm) {
	categoryForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		const name = categoryNameInput.value.trim();
		const categoryId = categoryIdInput ? categoryIdInput.value : '';
		if (!name) return;

		if (categoryId) {
			await fetch(`/api/categories/${categoryId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
			});
			showToast('Cập nhật danh mục thành công');
		} else {
			await fetch('/api/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
			});
			showToast('Thêm danh mục thành công');
		}

		categoryForm.reset();
		if (categoryIdInput) categoryIdInput.value = '';
		if (categorySubmit) categorySubmit.textContent = 'Thêm danh mục';
		await loadCategories();
	});
}

if (contactForm) {
	contactForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		const payload = {
			facebook: contactFacebookInput ? contactFacebookInput.value.trim() : '',
			instagram: contactInstagramInput ? contactInstagramInput.value.trim() : '',
			tiktok: contactTiktokInput ? contactTiktokInput.value.trim() : '',
		};
		await fetch('/api/contacts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		showToast('Lưu liên hệ thành công');
		await loadContacts();
	});
}

const loadProducts = async () => {
	const productsRes = await fetch('/api/products');
	allProducts = await productsRes.json();
	renderFeaturedProductOptions(allProducts);
	filterProducts();
	renderAdminList(allProducts);
};

const renderFeaturedProductOptions = (items) => {
	if (!featuredProductOptions) return;
	featuredProductOptions.innerHTML = '';
	items.forEach((item) => {
		const option = document.createElement('option');
		option.value = item.name;
		option.dataset.id = item.id;
		featuredProductOptions.appendChild(option);
	});
};

if (featuredProductSearch) {
	featuredProductSearch.addEventListener('input', () => {
		const match = allProducts.find(
			(item) => item.name.toLowerCase() === featuredProductSearch.value.trim().toLowerCase(),
		);
		featuredProductId.value = match ? match.id : '';
	});
}

const loadFeatured = async () => {
	const featuredRes = await fetch('/api/featured');
	featuredItems = await featuredRes.json();
	renderFeatured(featuredItems);
	renderFeaturedAdminList(featuredItems);
	updateFeaturedPosition();
	startFeaturedAuto();
};

const renderChips = (items) => {
	if (!chipList) return;
	chipList.innerHTML = '';
	items.forEach((item, index) => {
		const chip = document.createElement('button');
		chip.type = 'button';
		chip.className = `chip${index === 0 ? ' active' : ''}`;
		chip.dataset.category = item.name;
		chip.textContent = item.name;
		chip.addEventListener('click', () => {
			const chips = chipList.querySelectorAll('.chip');
			setActive(chips, chip);
			filterProducts();
		});
		chipList.appendChild(chip);
	});
};

const renderCategoryOptions = (items) => {
	if (!productCategoryInput) return;
	productCategoryInput.innerHTML = '';
	items
		.filter((item) => item.name !== 'Tất cả')
		.forEach((item, index) => {
			const option = document.createElement('option');
			option.value = item.name;
			option.textContent = item.name;
			if (index === 0) {
				option.selected = true;
			}
			productCategoryInput.appendChild(option);
		});
};

const renderCategoryList = (items) => {
	if (!categoryList) return;
	categoryList.innerHTML = '';
	items
		.filter((item) => item.name !== 'Tất cả')
		.forEach((item) => {
			const row = document.createElement('div');
			row.className = 'admin-item';

			const label = document.createElement('div');
			label.textContent = item.name;

			const edit = document.createElement('button');
			edit.type = 'button';
			edit.className = 'admin-edit';
			edit.textContent = 'Sửa';
			edit.addEventListener('click', () => {
				if (!categoryNameInput) return;
				categoryNameInput.value = item.name;
				if (categoryIdInput) categoryIdInput.value = item.id;
				if (categorySubmit) categorySubmit.textContent = 'Cập nhật danh mục';
			});

			const del = document.createElement('button');
			del.type = 'button';
			del.className = 'admin-delete';
			del.textContent = 'Xóa';
			del.addEventListener('click', async () => {
				await fetch(`/api/categories/${item.id}`, { method: 'DELETE' });
				await loadCategories();
			});

			row.appendChild(label);
			row.appendChild(edit);
			row.appendChild(del);
			categoryList.appendChild(row);
		});
};

const setContactLinks = (contacts) => {
	if (contactFacebookLink) {
		contactFacebookLink.href = contacts.facebook || '#';
		contactFacebookLink.classList.toggle('hidden', !contacts.facebook);
	}
	if (contactInstagramLink) {
		contactInstagramLink.href = contacts.instagram || '#';
		contactInstagramLink.classList.toggle('hidden', !contacts.instagram);
	}
	if (contactTiktokLink) {
		contactTiktokLink.href = contacts.tiktok || '#';
		contactTiktokLink.classList.toggle('hidden', !contacts.tiktok);
	}
};

const loadCategories = async () => {
	const categoriesRes = await fetch('/api/categories');
	allCategories = await categoriesRes.json();
	renderChips(allCategories);
	renderCategoryOptions(allCategories);
	renderCategoryList(allCategories);
};

const loadContacts = async () => {
	const contactsRes = await fetch('/api/contacts');
	const contacts = await contactsRes.json();
	setContactLinks(contacts);
	if (contactFacebookInput) contactFacebookInput.value = contacts.facebook || '';
	if (contactInstagramInput) contactInstagramInput.value = contacts.instagram || '';
	if (contactTiktokInput) contactTiktokInput.value = contacts.tiktok || '';
};

const loadData = async () => {
	const profileRes = await fetch('/api/profile');
	const profile = await profileRes.json();

		if (profileNameText && profile.name) {
			profileNameText.textContent = profile.name;
		}
		if (avatar && profile.name) {
			avatar.setAttribute('data-name', profile.name);
		}
		if (profileDesc) {
			profileDesc.textContent = profile.description || '';
		}
		if (profileAdminName) {
			profileAdminName.value = profile.name || '';
		}
		if (profileAdminDesc) {
			profileAdminDesc.value = profile.description || '';
		}
		if (profileAdminAvatar) {
			profileAdminAvatar.value = profile.avatar_url || '';
		}

		if (badgeList) {
			badgeList.innerHTML = '';
			const badgeCount = profile.badges_count || 0;
			for (let i = 0; i < badgeCount; i += 1) {
				const badge = document.createElement('span');
				badge.className = 'badge';
				badgeList.appendChild(badge);
			}
		}

		if (avatar && profile.avatar_url) {
			avatar.style.backgroundImage = `url(${profile.avatar_url})`;
		}
		if (profileCard && profile.avatar_url) {
			profileCard.style.backgroundImage = `url(${profile.avatar_url})`;
		}

	await loadCategories();
	await loadContacts();
	await loadFeatured();
	await loadProducts();
};

loadData();

if (adminLoginOverlay) {
	setAdminVisible(false);
	adminLoginForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		const payload = {
			username: adminUser.value.trim(),
			password: adminPass.value.trim(),
		};

		adminLoginMessage.textContent = '';
		if (!payload.username || !payload.password) {
			adminLoginMessage.textContent = 'Vui lòng nhập user và password';
			return;
		}

		const res = await fetch('/api/admin/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		if (res.ok) {
			adminLoginOverlay.classList.add('hidden');
			adminLoginMessage.textContent = '';
			adminLoginForm.reset();
			setAdminVisible(true);
		} else {
			adminLoginMessage.textContent = 'Sai user hoặc password';
			setAdminVisible(false);
		}
	});
}

if (profileAdminForm) {
	profileAdminForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		const formData = new FormData();
		formData.append('name', profileAdminName.value.trim());
		formData.append('description', profileAdminDesc.value.trim());
		const file = profileAdminAvatar.files[0];
		if (file) {
			formData.append('avatar', file);
		}

		const res = await fetch('/api/profile', {
			method: 'POST',
			body: formData,
		});

		if (res.ok) {
			showToast('Lưu thông tin thành công');
			await loadData();
		}
	});
}

if (featuredPrev) {
	featuredPrev.addEventListener('click', () => {
		const perView = getFeaturedPerView();
		const maxIndex = Math.max(0, featuredItems.length - perView);
		featuredIndex = featuredIndex <= 0 ? maxIndex : featuredIndex - 1;
		updateFeaturedPosition();
		startFeaturedAuto();
	});
}

if (featuredNext) {
	featuredNext.addEventListener('click', () => {
		const perView = getFeaturedPerView();
		const maxIndex = Math.max(0, featuredItems.length - perView);
		featuredIndex = featuredIndex >= maxIndex ? 0 : featuredIndex + 1;
		updateFeaturedPosition();
		startFeaturedAuto();
	});
}

let touchStartX = 0;
if (featuredList) {
	featuredList.addEventListener('touchstart', (event) => {
		touchStartX = event.touches[0].clientX;
	});

	featuredList.addEventListener('touchend', (event) => {
		const diff = touchStartX - event.changedTouches[0].clientX;
		if (Math.abs(diff) < 30) return;
		if (diff > 0 && featuredNext) {
			featuredNext.click();
		} else if (featuredPrev) {
			featuredPrev.click();
		}
	});
}

window.addEventListener('resize', updateFeaturedPosition);
