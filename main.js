const tabs = document.querySelectorAll('.tab');
const chipList = document.querySelector('#chipList');
const featuredList = document.querySelector('#featuredList');
const featuredPrev = document.querySelector('#featuredPrev');
const featuredNext = document.querySelector('#featuredNext');
const productList = document.querySelector('#productList');
const productSentinel = document.querySelector('#productSentinel');
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
const productImagePreview = document.querySelector('#productImagePreview');
const productImageDropzone = document.querySelector('#productImageDropzone');
const productLinkInput = document.querySelector('#productLink');
const productIdInput = document.querySelector('#productId');
const productSubmit = document.querySelector('#productSubmit');
const adminList = document.querySelector('#adminList');
const adminProductPagination = document.querySelector('#adminProductPagination');
const adminProductPrev = document.querySelector('#adminProductPrev');
const adminProductNext = document.querySelector('#adminProductNext');
const adminProductPageInfo = document.querySelector('#adminProductPageInfo');
const featuredForm = document.querySelector('#featuredForm');
const featuredProductSearch = document.querySelector('#featuredProductSearch');
const featuredProductOptions = document.querySelector('#featuredProductOptions');
const featuredProductId = document.querySelector('#featuredProductId');
const featuredAdminList = document.querySelector('#featuredAdminList');
const featuredSubmit = document.querySelector('#featuredSubmit');
const adminSections = document.querySelectorAll('.admin-section');
const adminLoginOverlay = document.querySelector('#loginOverlay');
const adminLoginForm = document.querySelector('#adminLoginForm');
const adminUser = document.querySelector('#adminUser');
const adminPass = document.querySelector('#adminPass');
const adminLoginMessage = document.querySelector('#adminLoginMessage');
const progressOverlay = document.querySelector('#progressOverlay');
const cropOverlay = document.querySelector('#cropOverlay');
const cropImage = document.querySelector('#cropImage');
const cropCancel = document.querySelector('#cropCancel');
const cropConfirm = document.querySelector('#cropConfirm');
const cropZoomIn = document.querySelector('#cropZoomIn');
const cropZoomOut = document.querySelector('#cropZoomOut');
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
const contactShopeeInput = document.querySelector('#contactShopeeInput');
const contactFacebookLink = document.querySelector('#contactFacebook');
const contactInstagramLink = document.querySelector('#contactInstagram');
const contactTiktokLink = document.querySelector('#contactTiktok');
const contactShopeeLink = document.querySelector('#contactShopee');
const toast = document.querySelector('#toast');
const pageLoader = document.querySelector('#pageLoader');

let allProducts = [];
let allCategories = [];
let featuredItems = [];
let featuredIndex = 0;
let featuredTimer = null;
let editingProductImageUrl = '';
let editingFeaturedId = null;
let currentProfile = null;
let currentContacts = null;
let cropperInstance = null;
let croppedProductFile = null;
let cropperReady = false;
let cropImageUrl = '';
let filteredProducts = [];
let visibleProductCount = 6;
let adminFilteredProducts = [];
let adminLoggedIn = false;
const PRODUCT_PAGE_SIZE = 6;
const ADMIN_PRODUCT_PAGE_SIZE = 8;
let adminProductPage = 1;
const supabaseConfig = window.SUPABASE_CONFIG || {};
let supabaseClient = null;

const getSupabaseClient = () => {
	if (!window.supabase || !supabaseConfig.url || !supabaseConfig.anonKey) return null;
	if (!supabaseClient) {
		supabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
	}
	return supabaseClient;
};

const getAdminLoginState = () => adminLoggedIn;

const setAdminLoginState = (value) => {
	adminLoggedIn = Boolean(value);
};

const hideAdminOverlay = () => {
	if (!adminLoginOverlay) return;
	adminLoginOverlay.classList.add('hidden');
	adminLoginOverlay.setAttribute('aria-hidden', 'true');
	adminLoginOverlay.setAttribute('hidden', '');
};

const showAdminOverlay = () => {
	if (!adminLoginOverlay) return;
	adminLoginOverlay.classList.remove('hidden');
	adminLoginOverlay.removeAttribute('hidden');
	adminLoginOverlay.setAttribute('aria-hidden', 'false');
};
const resizeImage = (file, options = {}) => new Promise((resolve, reject) => {
	const {
		maxWidth = 1600,
		maxHeight = 1600,
		quality = 0.9,
		format = 'image/webp',
	} = options;

	if (!file.type.startsWith('image/')) {
		resolve({ blob: file, contentType: file.type || 'application/octet-stream', ext: '' });
		return;
	}

	const img = new Image();
	const url = URL.createObjectURL(file);
	img.onload = () => {
		URL.revokeObjectURL(url);
		const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
		const width = Math.round(img.width * ratio);
		const height = Math.round(img.height * ratio);
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			reject(new Error('Canvas not supported'));
			return;
		}
		ctx.drawImage(img, 0, 0, width, height);
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('Failed to compress image'));
					return;
				}
				const ext = format === 'image/webp' ? 'webp' : format === 'image/jpeg' ? 'jpg' : '';
				resolve({ blob, contentType: format, ext });
			},
			format,
			quality,
		);
	};
	img.onerror = () => {
		URL.revokeObjectURL(url);
		reject(new Error('Invalid image'));
	};
	img.src = url;
});

const uploadToSupabase = async (file, folder = 'uploads') => {
	const client = getSupabaseClient();
	if (!client) return null;
	const bucket = supabaseConfig.bucket || 'uploads';

	const { blob, contentType, ext } = await resizeImage(file, {
		maxWidth: 1600,
		maxHeight: 1600,
		quality: 0.9,
		format: 'image/webp',
	});

	const safeExt = ext || (file.name.includes('.') ? file.name.split('.').pop() : '');
	const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt ? `.${safeExt}` : ''}`;
	const path = `${folder}/${safeName}`;
	const { error } = await client.storage.from(bucket).upload(path, blob, {
		upsert: true,
		contentType,
	});
	if (error) throw error;
	const { data } = client.storage.from(bucket).getPublicUrl(path);
	return data.publicUrl;
};

const buildAdminRow = (cells, isHeader = false) => {
	const row = document.createElement('div');
	row.className = `admin-row${isHeader ? ' admin-row--header' : ''}`;
	if (isHeader) {
		cells.forEach((label) => {
			const cell = document.createElement('div');
			cell.className = 'admin-cell';
			cell.textContent = label;
			row.appendChild(cell);
		});
		return row;
	}

	cells.forEach((cell) => {
		const wrapper = document.createElement('div');
		wrapper.className = 'admin-cell';
		if (cell instanceof HTMLElement) {
			wrapper.appendChild(cell);
		} else {
			wrapper.textContent = cell ?? '';
		}
		row.appendChild(wrapper);
	});
	return row;
};

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

const showProgress = () => {
	if (!progressOverlay) return;
	progressOverlay.classList.remove('hidden');
};

const hideProgress = () => {
	if (!progressOverlay) return;
	progressOverlay.classList.add('hidden');
};

const resetProductPreview = () => {
	croppedProductFile = null;
	if (productImagePreview) {
		productImagePreview.src = '';
		productImagePreview.classList.remove('is-visible');
	}
};

const openCropper = (file) => {
	if (!cropOverlay || !cropImage || !window.Cropper) return;
	cropperReady = false;
	if (cropImageUrl) {
		URL.revokeObjectURL(cropImageUrl);
		cropImageUrl = '';
	}
	cropImageUrl = URL.createObjectURL(file);
	cropOverlay.classList.remove('hidden');
	if (cropperInstance) {
		cropperInstance.destroy();
		cropperInstance = null;
	}
	cropImage.onload = () => {
		cropperInstance = new window.Cropper(cropImage, {
			dragMode: 'move',
			aspectRatio: 9 / 16,
			viewMode: 1,
			autoCropArea: 1,
			background: false,
			zoomable: true,
			zoomOnWheel: true,
			ready() {
				cropperReady = true;
			},
		});
	};
	cropImage.onerror = () => {
		showToast('Không thể mở ảnh');
		closeCropper();
	};
	cropImage.src = cropImageUrl;
};

const closeCropper = () => {
	if (cropperInstance) {
		cropperInstance.destroy();
		cropperInstance = null;
	}
	cropperReady = false;
	if (cropImageUrl) {
		URL.revokeObjectURL(cropImageUrl);
		cropImageUrl = '';
	}
	if (cropOverlay) {
		cropOverlay.classList.add('hidden');
	}
};

if (productImageInput) {
	productImageInput.addEventListener('change', () => {
		const file = productImageInput.files && productImageInput.files[0];
		if (!file) {
			resetProductPreview();
			return;
		}
		openCropper(file);
	});
}

if (productImageDropzone) {
	productImageDropzone.addEventListener('dragover', (event) => {
		event.preventDefault();
		productImageDropzone.classList.add('dragover');
	});
	productImageDropzone.addEventListener('dragleave', () => {
		productImageDropzone.classList.remove('dragover');
	});
	productImageDropzone.addEventListener('drop', (event) => {
		event.preventDefault();
		productImageDropzone.classList.remove('dragover');
		const file = event.dataTransfer?.files?.[0];
		if (file) {
			openCropper(file);
		}
	});
}

if (cropCancel) {
	cropCancel.addEventListener('click', () => {
		resetProductPreview();
		if (productImageInput) productImageInput.value = '';
		closeCropper();
	});
}

if (cropConfirm) {
	cropConfirm.addEventListener('click', async () => {
		if (!cropperInstance) return;
		const canvas = cropperInstance.getCroppedCanvas({ width: 900 });
		canvas.toBlob((blob) => {
			if (!blob) return;
			croppedProductFile = new File([blob], `cropped-${Date.now()}.webp`, {
				type: 'image/webp',
			});
			if (productImagePreview) {
				productImagePreview.src = URL.createObjectURL(blob);
				productImagePreview.classList.add('is-visible');
			}
			closeCropper();
		}, 'image/webp', 0.9);
	});
}

if (cropZoomIn) {
	cropZoomIn.addEventListener('click', () => {
		if (cropperInstance && cropperReady) cropperInstance.zoom(0.1);
	});
}

if (cropZoomOut) {
	cropZoomOut.addEventListener('click', () => {
		if (cropperInstance && cropperReady) cropperInstance.zoom(-0.1);
	});
}

const fillContactInputs = (contacts = {}) => {
	if (contactFacebookInput) contactFacebookInput.value = contacts.facebook || '';
	if (contactInstagramInput) contactInstagramInput.value = contacts.instagram || '';
	if (contactTiktokInput) contactTiktokInput.value = contacts.tiktok || '';
	if (contactShopeeInput) contactShopeeInput.value = contacts.shopee || '';
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
	const totalPages = Math.max(1, Math.ceil(items.length / ADMIN_PRODUCT_PAGE_SIZE));
	if (adminProductPage > totalPages) adminProductPage = totalPages;
	const startIndex = (adminProductPage - 1) * ADMIN_PRODUCT_PAGE_SIZE;
	const endIndex = startIndex + ADMIN_PRODUCT_PAGE_SIZE;
	const pageItems = items.slice(startIndex, endIndex);
	adminList.innerHTML = '';
	adminList.className = 'admin-list admin-grid admin-grid--product-cards admin-grid--product-cards-4';
	pageItems.forEach((item) => {
		const card = document.createElement('article');
		card.className = 'admin-card';

		const media = document.createElement('div');
		media.className = 'admin-card-media';
		if (item.image_url) {
			media.style.backgroundImage = `url(${item.image_url})`;
		}

		const body = document.createElement('div');
		body.className = 'admin-card-body';

		const title = document.createElement('div');
		title.className = 'admin-card-title';
		title.textContent = item.name;

		const meta = document.createElement('div');
		meta.className = 'admin-card-meta';
		const categoryChip = document.createElement('span');
		categoryChip.className = 'admin-chip';
		categoryChip.textContent = item.category || 'Chưa phân loại';
		const idTag = document.createElement('span');
		idTag.className = 'admin-id';
		idTag.textContent = `#${item.id}`;
		meta.appendChild(categoryChip);
		meta.appendChild(idTag);

		const links = document.createElement('div');
		links.className = 'admin-card-links';
		const imageLink = document.createElement('a');
		imageLink.className = 'admin-link';
		imageLink.href = item.image_url || '#';
		imageLink.target = '_blank';
		imageLink.rel = 'noopener';
		imageLink.textContent = item.image_url ? 'Ảnh (Supabase)' : 'Chưa có ảnh';

		const productLink = document.createElement('a');
		productLink.className = 'admin-link';
		productLink.href = item.link || '#';
		productLink.target = '_blank';
		productLink.rel = 'noopener';
		productLink.textContent = item.link ? 'Link sản phẩm' : 'Chưa có link';

		links.appendChild(imageLink);
		links.appendChild(productLink);

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
			showProgress();
			try {
				await fetch(`/api/products/${item.id}`, { method: 'DELETE' });
				await loadProducts();
			} finally {
				hideProgress();
			}
		});

		const actions = document.createElement('div');
		actions.className = 'admin-actions';
		actions.appendChild(edit);
		actions.appendChild(del);

		body.appendChild(title);
		body.appendChild(meta);
		body.appendChild(links);
		body.appendChild(actions);

		card.appendChild(media);
		card.appendChild(body);
		adminList.appendChild(card);
	});
	if (adminProductPagination) {
		adminProductPagination.classList.toggle('hidden', totalPages <= 1);
		if (adminProductPageInfo) {
			adminProductPageInfo.textContent = `Trang ${adminProductPage} / ${totalPages}`;
		}
		if (adminProductPrev) adminProductPrev.disabled = adminProductPage <= 1;
		if (adminProductNext) adminProductNext.disabled = adminProductPage >= totalPages;
	}
};

const sortProductsByName = (items) =>
	[...items].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' }));

const updateAdminProductView = () => {
	if (!productCategoryInput) {
		adminFilteredProducts = sortProductsByName(allProducts);
		renderAdminList(adminFilteredProducts);
		return;
	}
	const selectedCategory = productCategoryInput.value || 'Tất cả';
	const baseList = selectedCategory === 'Tất cả'
		? allProducts
		: allProducts.filter((item) => item.category === selectedCategory);
	adminFilteredProducts = sortProductsByName(baseList);
	adminProductPage = 1;
	renderAdminList(adminFilteredProducts);
};

const renderFeaturedAdminList = (items) => {
	if (!featuredAdminList) return;
	featuredAdminList.innerHTML = '';
	featuredAdminList.className = 'admin-list admin-grid--product-cards';
	items.forEach((item) => {
		const card = document.createElement('article');
		card.className = 'admin-card';

		const media = document.createElement('div');
		media.className = 'admin-card-media';
		const imageUrl = item.product_image || item.image_url || '';
		if (imageUrl) {
			media.style.backgroundImage = `url(${imageUrl})`;
		}

		const body = document.createElement('div');
		body.className = 'admin-card-body';

		const title = document.createElement('div');
		title.className = 'admin-card-title';
		title.textContent = item.product_name || item.name || '';

		const meta = document.createElement('div');
		meta.className = 'admin-card-meta';
		const featuredChip = document.createElement('span');
		featuredChip.className = 'admin-chip';
		featuredChip.textContent = 'Nổi bật';
		const idTag = document.createElement('span');
		idTag.className = 'admin-id';
		idTag.textContent = item.product_id ? `ID SP: ${item.product_id}` : 'ID SP: -';
		meta.appendChild(featuredChip);
		meta.appendChild(idTag);

		const links = document.createElement('div');
		links.className = 'admin-card-links';
		const imageLink = document.createElement('a');
		imageLink.className = 'admin-link';
		imageLink.href = imageUrl || '#';
		imageLink.target = '_blank';
		imageLink.rel = 'noopener';
		imageLink.textContent = imageUrl ? 'Ảnh (Supabase)' : 'Chưa có ảnh';

		const linkUrl = item.product_link || '';
		const productLink = document.createElement('a');
		productLink.className = 'admin-link';
		productLink.href = linkUrl || '#';
		productLink.target = '_blank';
		productLink.rel = 'noopener';
		productLink.textContent = linkUrl ? 'Link sản phẩm' : 'Chưa có link';

		links.appendChild(imageLink);
		links.appendChild(productLink);

		const edit = document.createElement('button');
		edit.type = 'button';
		edit.className = 'admin-edit';
		edit.textContent = 'Sửa';
		edit.addEventListener('click', () => {
			if (!featuredProductSearch || !featuredProductId) return;
			featuredProductSearch.value = item.product_name || item.name || '';
			featuredProductId.value = item.product_id || '';
			editingFeaturedId = item.id;
			if (featuredSubmit) {
				featuredSubmit.textContent = 'Cập nhật nổi bật';
			}
		});

		const del = document.createElement('button');
		del.type = 'button';
		del.className = 'admin-delete';
		del.textContent = 'Xóa';
		del.addEventListener('click', async () => {
			await fetch(`/api/featured/${item.id}`, { method: 'DELETE' });
			await loadFeatured();
		});

		const actions = document.createElement('div');
		actions.className = 'admin-actions';
		actions.appendChild(edit);
		actions.appendChild(del);

		body.appendChild(title);
		body.appendChild(meta);
		body.appendChild(links);
		body.appendChild(actions);

		card.appendChild(media);
		card.appendChild(body);
		featuredAdminList.appendChild(card);
	});
};

const filterProducts = () => {
	const activeChip = document.querySelector('.chip.active');
	const chipValue = activeChip ? activeChip.dataset.category : 'Tất cả';
	const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';

	filteredProducts = allProducts.filter((product) => {
		const matchCategory = chipValue === 'Tất cả' || product.category === chipValue;
		const matchName = product.name.toLowerCase().includes(keyword);
		return matchCategory && matchName;
	});
	visibleProductCount = PRODUCT_PAGE_SIZE;
	renderProducts(filteredProducts.slice(0, visibleProductCount));
};

tabs.forEach((tab) => {
	tab.addEventListener('click', () => setActive(tabs, tab));
});

if (searchInput) {
	searchInput.addEventListener('input', filterProducts);
}

const loadMoreProducts = () => {
	if (!filteredProducts.length) return;
	if (visibleProductCount >= filteredProducts.length) return;
	visibleProductCount = Math.min(visibleProductCount + PRODUCT_PAGE_SIZE, filteredProducts.length);
	renderProducts(filteredProducts.slice(0, visibleProductCount));
};

const handleProductScroll = () => {
	const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
	if (nearBottom) {
		loadMoreProducts();
	}
};

if (productForm) {
	productForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const name = productNameInput.value.trim();
	const category = productCategoryInput.value.trim();
	const file = croppedProductFile || productImageInput.files[0];
	const link = productLinkInput ? productLinkInput.value.trim() : '';
	const productId = productIdInput ? productIdInput.value : '';

	if (!name || !category) {
		return;
	}
	if (category === 'Tất cả') {
		showToast('Vui lòng chọn danh mục khác ngoài "Tất cả"');
		return;
	}

	let res = null;
	showProgress();
	try {
		if (file && getSupabaseClient()) {
			const imageUrl = await uploadToSupabase(file, 'products');
			const payload = { name, category, link, image_url: imageUrl };
			res = await fetch(productId ? `/api/products/${productId}` : '/api/products', {
				method: productId ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			editingProductImageUrl = imageUrl;
		} else {
			const formData = new FormData();
			formData.append('name', name);
			formData.append('category', category);
			formData.append('link', link);
			if (file) {
				formData.append('image', file);
			} else if (productId && editingProductImageUrl) {
				formData.append('image_url', editingProductImageUrl);
			}

			res = await fetch(productId ? `/api/products/${productId}` : '/api/products', {
				method: productId ? 'PUT' : 'POST',
				body: formData,
			});
		}
	} catch (error) {
		showToast('Lỗi upload ảnh');
		return;
	} finally {
		hideProgress();
	}

	if (res && res.ok) {
		showToast(productId ? 'Lưu sản phẩm thành công' : 'Thêm sản phẩm thành công');
	}

	productForm.reset();
	resetProductPreview();
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

	if (editingFeaturedId) {
		await fetch(`/api/featured/${editingFeaturedId}`, { method: 'DELETE' });
	}

	await fetch('/api/featured', {
		method: 'POST',
		body: formData,
	});

	featuredForm.reset();
	featuredProductId.value = '';
	editingFeaturedId = null;
	if (featuredSubmit) featuredSubmit.textContent = 'Thêm nổi bật';
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
			shopee: contactShopeeInput ? contactShopeeInput.value.trim() : '',
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
	filteredProducts = allProducts;
	visibleProductCount = PRODUCT_PAGE_SIZE;
	adminProductPage = 1;
	renderFeaturedProductOptions(allProducts);
	filterProducts();
	updateAdminProductView();
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
	let hasDefault = false;
	items.forEach((item, index) => {
		const option = document.createElement('option');
		option.value = item.name;
		option.textContent = item.name;
		if (!hasDefault && (item.name === 'Tất cả' || index === 0)) {
			option.selected = true;
			hasDefault = true;
		}
		productCategoryInput.appendChild(option);
	});
	updateAdminProductView();
};

const renderCategoryList = (items) => {
	if (!categoryList) return;
	categoryList.innerHTML = '';
	categoryList.className = 'admin-list admin-grid admin-grid--category';
	categoryList.appendChild(
		buildAdminRow(['ID', 'Tên', 'Ảnh', 'Thao tác'], true),
	);
	items
		.filter((item) => item.name !== 'Tất cả')
		.forEach((item) => {
			const imagePlaceholder = document.createElement('span');
			imagePlaceholder.textContent = '-';

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

			const actions = document.createElement('div');
			actions.className = 'admin-actions';
			actions.appendChild(edit);
			actions.appendChild(del);

			categoryList.appendChild(
				buildAdminRow([String(item.id), item.name, imagePlaceholder, actions], false),
			);
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
	if (contactShopeeLink) {
		contactShopeeLink.href = contacts.shopee || '#';
		contactShopeeLink.classList.toggle('hidden', !contacts.shopee);
	}
};

const loadCategories = async () => {
	const categoriesRes = await fetch('/api/categories');
	allCategories = await categoriesRes.json();
	renderChips(allCategories);
	renderCategoryOptions(allCategories);
	renderCategoryList(allCategories);
};

const loadContacts = async (fillAdmin = true) => {
	const contactsRes = await fetch('/api/contacts');
	const contacts = await contactsRes.json();
	currentContacts = contacts;
	setContactLinks(contacts);
	if (fillAdmin) {
		fillContactInputs(contacts);
	}
};

const loadData = async (fillAdmin = true) => {
	if (pageLoader) {
		pageLoader.classList.remove('hidden');
	}
	try {
		const profileRes = await fetch('/api/profile');
		const profile = await profileRes.json();
		currentProfile = profile;

		if (profileNameText && profile.name) {
			profileNameText.textContent = profile.name;
		}
		if (avatar && profile.name) {
			avatar.setAttribute('data-name', profile.name);
		}
		if (profileDesc) {
			profileDesc.textContent = profile.description || '';
		}
		if (fillAdmin) {
			if (profileAdminName) {
				profileAdminName.value = profile.name || '';
			}
			if (profileAdminDesc) {
				profileAdminDesc.value = profile.description || '';
			}
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
		await loadContacts(fillAdmin);
		await loadFeatured();
		await loadProducts();
	} catch (error) {
		showToast('Không tải được dữ liệu');
	} finally {
		if (pageLoader) {
			pageLoader.classList.add('hidden');
		}
	}
};

const bootAdminData = () => {
	adminLoggedIn = false;
	const loggedIn = getAdminLoginState();
	if (adminLoginOverlay) {
		if (loggedIn) {
			hideAdminOverlay();
			setAdminVisible(true);
		} else {
			showAdminOverlay();
			setAdminVisible(false);
		}
	}
	const fillAdmin = !adminLoginOverlay || loggedIn;
	loadData(fillAdmin);
};

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', bootAdminData);
} else {
	bootAdminData();
}

if (productSentinel) {
	const productObserver = new IntersectionObserver(
		(entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				loadMoreProducts();
			}
		},
		{ rootMargin: '200px 0px' },
	);
	productObserver.observe(productSentinel);
}

if (adminLoginOverlay) {
	const loggedIn = getAdminLoginState();
	if (loggedIn) {
		hideAdminOverlay();
		setAdminVisible(true);
	} else {
		showAdminOverlay();
		setAdminVisible(false);
	}
	if (adminLoginForm) {
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
			setAdminLoginState(true);
			hideAdminOverlay();
			adminLoginMessage.textContent = '';
			adminLoginForm.reset();
			setAdminVisible(true);
			await loadData(true);
			if (currentContacts) {
				fillContactInputs(currentContacts);
			}
		} else {
			setAdminLoginState(false);
			showAdminOverlay();
			adminLoginMessage.textContent = 'Sai user hoặc password';
			setAdminVisible(false);
		}
	});
	}
}

if (profileAdminForm) {
	profileAdminForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		const name = profileAdminName.value.trim();
		const description = profileAdminDesc.value.trim();
		const file = profileAdminAvatar.files[0];
		let res = null;

		try {
			if (file && getSupabaseClient()) {
				const avatarUrl = await uploadToSupabase(file, 'avatars');
				res = await fetch('/api/profile', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name,
						description,
						avatar_url: avatarUrl,
					}),
				});
			} else if (file) {
				const formData = new FormData();
				formData.append('name', name);
				formData.append('description', description);
				formData.append('avatar', file);
				res = await fetch('/api/profile', {
					method: 'POST',
					body: formData,
				});
			} else {
				const avatarUrl = currentProfile?.avatar_url || '';
				res = await fetch('/api/profile', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name, description, avatar_url: avatarUrl }),
				});
			}
		} catch (error) {
			showToast('Lỗi upload ảnh');
			return;
		}

		if (res && res.ok) {
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

if (adminProductPrev) {
	adminProductPrev.addEventListener('click', () => {
		if (adminProductPage > 1) {
			adminProductPage -= 1;
			renderAdminList(adminFilteredProducts.length ? adminFilteredProducts : allProducts);
		}
	});
}

if (adminProductNext) {
	adminProductNext.addEventListener('click', () => {
		const source = adminFilteredProducts.length ? adminFilteredProducts : allProducts;
		const totalPages = Math.max(1, Math.ceil(source.length / ADMIN_PRODUCT_PAGE_SIZE));
		if (adminProductPage < totalPages) {
			adminProductPage += 1;
			renderAdminList(source);
		}
	});
}

if (productCategoryInput) {
	productCategoryInput.addEventListener('change', () => {
		updateAdminProductView();
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

const productLoadingEl = document.getElementById('productLoading');
let pendingGetCount = 0;

const showLoading = () => {
  if (!productLoadingEl) return;
  productLoadingEl.hidden = false;
  productLoadingEl.setAttribute('aria-busy', 'true');
};

const hideLoading = () => {
  if (!productLoadingEl) return;
  productLoadingEl.hidden = true;
  productLoadingEl.removeAttribute('aria-busy');
};

const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
	const method =
		(init && init.method) ||
		(input && input.method) ||
		'GET';
	const isGet = String(method).toUpperCase() === 'GET';
	if (isGet) {
		pendingGetCount += 1;
		showLoading();
	}
	try {
		return await originalFetch(input, init);
	} finally {
		if (isGet) {
			pendingGetCount = Math.max(0, pendingGetCount - 1);
			if (pendingGetCount === 0) hideLoading();
		}
	}
};

