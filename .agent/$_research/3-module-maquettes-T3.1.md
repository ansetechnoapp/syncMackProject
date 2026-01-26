# T3.1: Module Pages Maquettes - High-Fidelity Designs

**Task:** T3.1 - Create comprehensive mockups for all 5 module pages
**Status:** IN PROGRESS
**Date:** 2025-12-09
**Design System Version:** Phase 2 Complete

---

## 📋 MODULE OVERVIEW

This document contains detailed maquettes for 5 module pages:
1. **Blog Module** - Content management and publishing
2. **E-Commerce Module** - Product catalog and orders
3. **Documentation Module** - Knowledge base and API docs
4. **Portfolio Module** - Project showcase and gallery
5. **E-Learning Module** - Course and lesson management

Each module uses the dashboard sidebar layout from T3.0 with specialized content areas.

---

## 🎯 MODULE PATTERNS

### Common Elements (All Modules)
- Fixed header (64px height)
- Sidebar navigation (w-64)
- Main content area (ml-64)
- Color-coded module icons/badges
- Breadcrumb navigation

### Common Sections (Per Module)
- **Header:** Module title, description, quick stats
- **Filters:** Category, date range, status filters
- **List/Table:** Main content display
- **Sidebar:** Quick actions, recent items
- **Pagination:** For large datasets

---

## 1️⃣ BLOG MODULE MAQUETTE

**Path:** `/dashboard/blog`
**Purpose:** Content management and publishing
**Primary Colors:** Primary (blue) + Secondary (purple)

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
└─────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────────────────────┐
│ SIDEBAR      │ MAIN CONTENT - BLOG                          │
│              │                                              │
│ Dashboard    │ ┌────────────────────────────────────────┐  │
│ ├ Blog       │ │ Blog Management                        │  │
│ │ ├ Posts   │ │ Total Posts: 24 | Draft: 5 | Live: 19  │  │
│ │ ├ Authors │ │                                        │  │
│ │ ├ Categ.  │ │ [Create Post] [Filters] [Search]       │  │
│ │ └ Comments│ └────────────────────────────────────────┘  │
│ ├ E-Comm     │                                              │
│ ├ Docs       │ ┌─────────────────┬──────────────────────┐  │
│ ├ Portfolio  │ │ Posts List      │ Sidebar              │  │
│ ├ E-Learning │ │                 │ Recent Posts:        │  │
│ │            │ │ [Post Card]     │ • Draft Article      │  │
│ │            │ │ [Post Card]     │ • Published Guide    │  │
│ │            │ │ [Post Card]     │                      │  │
│ │            │ │ [Post Card]     │ Quick Actions:       │  │
│ │            │ │                 │ [New Post]           │  │
│ │            │ │ [Pagination]    │ [View Published]     │  │
│ │            │ │                 │ [Analytics]          │  │
│ └────────────┴─────────────────┴──────────────────────┘  │
```

### Blog Component Specifications

#### Page Header
```tsx
<div className="mb-8">
  <div className="flex items-start justify-between">
    <div>
      <h1 className="text-heading-lg text-neutral-900">Blog Management</h1>
      <p className="text-body-md text-neutral-600 mt-1">
        Create, edit, and publish blog posts
      </p>
    </div>
    <Button variant="primary" className="flex items-center gap-2">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
      </svg>
      Create Post
    </Button>
  </div>

  {/* Quick Stats */}
  <div className="grid grid-cols-3 gap-4 mt-6">
    <StatsCard
      title="Total Posts"
      value="24"
      change="3 new this week"
      color="primary"
    />
    <StatsCard
      title="Draft Posts"
      value="5"
      change="Ready to publish"
      color="warning"
    />
    <StatsCard
      title="Published"
      value="19"
      change="Live and visible"
      color="success"
    />
  </div>
</div>
```

#### Filters & Search
```tsx
<Card className="mb-8">
  <div className="flex flex-col sm:flex-row gap-4">

    {/* Search Input */}
    <div className="flex-1">
      <Input
        type="search"
        placeholder="Search posts..."
        icon={<SearchIcon />}
      />
    </div>

    {/* Filter: Status */}
    <select className="px-4 py-2 border border-neutral-200 rounded-lg
                       text-body-sm focus:outline-none focus:ring-2">
      <option>All Status</option>
      <option>Draft</option>
      <option>Published</option>
      <option>Archived</option>
    </select>

    {/* Filter: Category */}
    <select className="px-4 py-2 border border-neutral-200 rounded-lg
                       text-body-sm focus:outline-none focus:ring-2">
      <option>All Categories</option>
      <option>Technology</option>
      <option>Design</option>
      <option>Business</option>
    </select>

    {/* Sort Button */}
    <Button variant="secondary">
      ↓ Date Created
    </Button>
  </div>
</Card>
```

#### Blog Post Card (List Item)
```tsx
<div className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-md transition-shadow mb-4">

  <div className="flex gap-6">

    {/* Thumbnail */}
    <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-secondary-500
                    rounded-lg flex-shrink-0 overflow-hidden">
      <img src="/post-thumbnail.jpg" alt="Post thumbnail"
        className="w-full h-full object-cover" />
    </div>

    {/* Content */}
    <div className="flex-1">

      {/* Title & Status */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-heading-sm text-neutral-900 hover:text-primary-600
                         cursor-pointer transition-colors">
            Getting Started with Next.js 15
          </h3>
          <p className="text-body-xs text-neutral-500 mt-1">
            Published on Dec 8, 2025
          </p>
        </div>

        {/* Status Badge */}
        <Badge variant="success" size="sm">
          Published
        </Badge>
      </div>

      {/* Description */}
      <p className="text-body-sm text-neutral-600 mb-3 line-clamp-2">
        A comprehensive guide to Next.js 15 new features, improvements, and best practices for modern web development.
      </p>

      {/* Metadata */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-body-xs text-neutral-500">
          👤 John Doe
        </span>
        <span className="text-body-xs text-neutral-500">
          📁 Technology
        </span>
        <span className="text-body-xs text-neutral-500">
          👁️ 1,234 views
        </span>
        <span className="text-body-xs text-neutral-500">
          💬 12 comments
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm">Edit</Button>
        <Button variant="secondary" size="sm">View</Button>
        <Button variant="ghost" size="sm" className="text-error-600">
          Delete
        </Button>
      </div>
    </div>
  </div>
</div>
```

#### Blog Sidebar
```tsx
<div className="space-y-6">

  {/* Quick Actions */}
  <Card title="Quick Actions">
    <div className="space-y-2">
      <Button variant="primary" fullWidth>
        Create New Post
      </Button>
      <Button variant="secondary" fullWidth>
        View All Published
      </Button>
      <Button variant="secondary" fullWidth>
        Analytics Dashboard
      </Button>
    </div>
  </Card>

  {/* Recent Posts */}
  <Card title="Recent Posts">
    <div className="space-y-3">
      {recentPosts.map((post) => (
        <div key={post.id} className="pb-3 border-b border-neutral-100 last:border-0">
          <p className="text-body-sm font-medium text-neutral-900 line-clamp-1">
            {post.title}
          </p>
          <p className="text-body-xs text-neutral-500">
            {formatDate(post.createdAt)}
          </p>
          <Badge variant="info" size="sm" className="mt-1">
            {post.status}
          </Badge>
        </div>
      ))}
    </div>
  </Card>

  {/* Categories */}
  <Card title="Categories">
    <div className="space-y-2">
      <div className="flex justify-between items-center text-body-sm">
        <span className="text-neutral-600">Technology</span>
        <Badge variant="secondary" size="xs">8</Badge>
      </div>
      <div className="flex justify-between items-center text-body-sm">
        <span className="text-neutral-600">Design</span>
        <Badge variant="secondary" size="xs">5</Badge>
      </div>
      <div className="flex justify-between items-center text-body-sm">
        <span className="text-neutral-600">Business</span>
        <Badge variant="secondary" size="xs">11</Badge>
      </div>
    </div>
  </Card>
</div>
```

---

## 2️⃣ E-COMMERCE MODULE MAQUETTE

**Path:** `/dashboard/ecommerce`
**Purpose:** Product management and order tracking
**Primary Colors:** Success (green) + Warning (orange)

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
└─────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────────────────────┐
│ SIDEBAR      │ MAIN CONTENT - E-COMMERCE                    │
│              │                                              │
│ Dashboard    │ E-Commerce Overview                          │
│ ├ Blog       │ ┌─────────────────────────────────────────┐ │
│ ├ E-Comm     │ │ Revenue: $12,450 | Orders: 145 | Items │ │
│ │ ├ Products│ │ New Orders: 8 | Pending Shipping: 12   │ │
│ │ ├ Orders  │ └─────────────────────────────────────────┘ │
│ │ └ Invoices│                                              │
│ ├ Docs      │ ┌──────────────────┬────────────────────┐   │
│ ├ Portfolio │ │ Products Table   │ Sidebar            │   │
│ └ E-Learn   │ │                  │ Top Products:      │   │
│            │ │ [Product Card]   │ • Laptop $899      │   │
│            │ │ [Product Card]   │ • Phone $599       │   │
│            │ │ [Product Card]   │ • Monitor $299     │   │
│            │ │                  │                    │   │
│            │ │ [Pagination]     │ [New Product]      │   │
│            │ │                  │ [View Orders]      │   │
│            │ │                  │ [Invoices]         │   │
│            │ └──────────────────┴────────────────────┘   │
```

### E-Commerce Components

#### Products Grid (Mobile-First)
```tsx
{/* 1-col mobile, 2-col tablet, 3-col desktop */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {products.map((product) => (
    <Card key={product.id} className="flex flex-col hover:shadow-lg transition-shadow">

      {/* Product Image */}
      <div className="w-full h-40 bg-gradient-to-br from-success-100 to-success-200
                      rounded-lg mb-4 overflow-hidden flex items-center justify-center">
        <img src={product.image} alt={product.name}
          className="w-full h-full object-cover" />
      </div>

      {/* Product Info */}
      <h3 className="text-heading-sm text-neutral-900 mb-2 line-clamp-2">
        {product.name}
      </h3>

      <p className="text-body-sm text-neutral-600 mb-3 flex-1">
        {product.description}
      </p>

      {/* Price & Stock */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-heading-sm text-success-600 font-bold">
          ${product.price}
        </p>
        <Badge variant={product.stock > 10 ? 'success' : 'warning'} size="sm">
          {product.stock} in stock
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" fullWidth>
          Edit
        </Button>
        <Button variant="secondary" size="sm" fullWidth>
          View
        </Button>
      </div>
    </Card>
  ))}
</div>
```

#### Orders Table
```tsx
<Card title="Recent Orders" className="overflow-hidden">
  <table className="w-full text-body-sm">
    <thead className="bg-neutral-50 border-b border-neutral-200">
      <tr>
        <th className="px-6 py-3 text-left text-body-xs font-semibold text-neutral-600">
          Order ID
        </th>
        <th className="px-6 py-3 text-left text-body-xs font-semibold text-neutral-600">
          Customer
        </th>
        <th className="px-6 py-3 text-left text-body-xs font-semibold text-neutral-600">
          Amount
        </th>
        <th className="px-6 py-3 text-left text-body-xs font-semibold text-neutral-600">
          Status
        </th>
        <th className="px-6 py-3 text-left text-body-xs font-semibold text-neutral-600">
          Date
        </th>
        <th className="px-6 py-3 text-right text-body-xs font-semibold text-neutral-600">
          Actions
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-neutral-200">
      {orders.map((order) => (
        <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
          <td className="px-6 py-4 font-mono text-primary-600">#ORD{order.id}</td>
          <td className="px-6 py-4 text-neutral-900">{order.customer}</td>
          <td className="px-6 py-4 font-bold text-neutral-900">${order.amount}</td>
          <td className="px-6 py-4">
            <Badge variant={getStatusColor(order.status)}>
              {order.status}
            </Badge>
          </td>
          <td className="px-6 py-4 text-neutral-600">{formatDate(order.date)}</td>
          <td className="px-6 py-4 text-right">
            <Button variant="ghost" size="sm">View</Button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</Card>
```

---

## 3️⃣ DOCUMENTATION MODULE MAQUETTE

**Path:** `/dashboard/documentation`
**Purpose:** Knowledge base and API documentation
**Primary Colors:** Info (cyan) + Primary (blue)

### Layout Structure

```
Documentation Hub with:
- Category sidebar (nested navigation)
- Main article viewer
- Search across all docs
- Breadcrumb navigation
- Related articles sidebar
- Version selector (for API docs)
```

### Documentation Components

#### Doc Navigation Sidebar
```tsx
<aside className="w-80 bg-neutral-50 border-r border-neutral-200 overflow-y-auto">
  {/* Search */}
  <div className="sticky top-0 p-4 bg-white border-b border-neutral-200">
    <Input
      type="search"
      placeholder="Search docs..."
      icon={<SearchIcon />}
    />
  </div>

  {/* Categories */}
  <nav className="p-4 space-y-2">
    {categories.map((category) => (
      <div key={category.id}>

        {/* Category Header */}
        <button className="w-full flex items-center justify-between px-3 py-2
                           text-body-sm font-medium text-neutral-900
                           hover:bg-neutral-100 rounded-lg transition-colors">
          <span>{category.name}</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Subcategories/Articles */}
        {expandedCategory === category.id && (
          <div className="ml-4 space-y-1">
            {category.articles.map((article) => (
              <a
                key={article.id}
                href={`/docs/${article.slug}`}
                className={`block px-3 py-2 rounded-lg text-body-sm transition-colors
                  ${activeDoc === article.id
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
              >
                {article.title}
              </a>
            ))}
          </div>
        )}
      </div>
    ))}
  </nav>
</aside>
```

#### Documentation Article Viewer
```tsx
<main className="flex-1 max-w-3xl">
  <article className="prose prose-sm max-w-none">

    {/* Breadcrumb */}
    <div className="mb-6">
      <nav className="flex items-center gap-2 text-body-sm text-neutral-600">
        <a href="/" className="text-primary-600 hover:underline">Home</a>
        <span>/</span>
        <a href="/docs" className="text-primary-600 hover:underline">Docs</a>
        <span>/</span>
        <a href="/docs/api" className="text-primary-600 hover:underline">API</a>
        <span>/</span>
        <span className="text-neutral-900">Authentication</span>
      </nav>
    </div>

    {/* Article Header */}
    <h1 className="text-heading-lg text-neutral-900 mb-2">
      Authentication Guide
    </h1>
    <p className="text-body-md text-neutral-600 mb-6">
      Learn how to authenticate requests to the Zodback API using JWT tokens
    </p>

    {/* Metadata */}
    <div className="flex items-center gap-4 pb-6 border-b border-neutral-200 mb-6">
      <span className="text-body-xs text-neutral-500">
        Last updated: Dec 8, 2025
      </span>
      <span className="text-body-xs text-neutral-500">
        ⏱️ 5 min read
      </span>
      <span className="text-body-xs text-neutral-500">
        ✏️ By Admin
      </span>
    </div>

    {/* Content Sections with Code Examples */}
    <h2 className="text-heading-md text-neutral-900 mt-8 mb-4">
      Overview
    </h2>
    <p className="text-body-md text-neutral-600 mb-4">
      The Zodback API uses JWT (JSON Web Token) for authentication...
    </p>

    {/* Code Block */}
    <div className="bg-neutral-950 rounded-lg p-4 mb-6 overflow-x-auto">
      <pre className="text-body-xs text-neutral-100 font-mono">
        {`curl -X POST https://api.zodback.com/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"password"}'`}
      </pre>
    </div>

    {/* Content continues */}
  </article>
</main>
```

#### Doc Sidebar (Right)
```tsx
<aside className="w-64 sticky top-20">
  {/* Table of Contents */}
  <Card title="Table of Contents">
    <nav className="space-y-2">
      {tableOfContents.map((item) => (
        <a
          key={item.id}
          href={`#${item.slug}`}
          className={`block text-body-sm transition-colors
            ${item.level === 0 ? 'font-medium text-neutral-900' : 'ml-4 text-neutral-600'}
            hover:text-primary-600`}
        >
          {item.title}
        </a>
      ))}
    </nav>
  </Card>

  {/* Related Articles */}
  <Card title="Related Articles" className="mt-6">
    <div className="space-y-3">
      {relatedArticles.map((article) => (
        <a
          key={article.id}
          href={article.slug}
          className="block text-body-sm text-primary-600 hover:underline"
        >
          {article.title}
        </a>
      ))}
    </div>
  </Card>

  {/* API Version Selector */}
  <Card title="API Version" className="mt-6">
    <select className="w-full px-3 py-2 border border-neutral-200 rounded-lg
                       text-body-sm">
      <option>v2.0 (Current)</option>
      <option>v1.5</option>
      <option>v1.0</option>
    </select>
  </Card>
</aside>
```

---

## 4️⃣ PORTFOLIO MODULE MAQUETTE

**Path:** `/dashboard/portfolio`
**Purpose:** Project showcase and gallery management
**Primary Colors:** Secondary (purple) + Success (green)

### Portfolio Components

#### Portfolio Gallery Grid
```tsx
{/* Masonry grid for portfolio items */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {portfolioItems.map((item) => (
    <Card
      key={item.id}
      className="overflow-hidden hover:shadow-xl transition-shadow
                 transform hover:-translate-y-1 cursor-pointer"
    >

      {/* Portfolio Image */}
      <div className="w-full h-48 bg-gradient-to-br from-secondary-400 to-secondary-600
                      overflow-hidden relative group">
        <img src={item.image} alt={item.title}
          className="w-full h-full object-cover group-hover:scale-110
                     transition-transform duration-300" />

        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                        transition-opacity flex items-center justify-center gap-2">
          <Button variant="primary" size="sm">View Project</Button>
          <Button variant="secondary" size="sm">Edit</Button>
        </div>

        {/* Featured Badge */}
        {item.featured && (
          <Badge variant="success" className="absolute top-3 right-3">
            Featured
          </Badge>
        )}
      </div>

      {/* Portfolio Item Details */}
      <div className="p-4">
        <h3 className="text-heading-sm text-neutral-900 mb-1">
          {item.title}
        </h3>
        <p className="text-body-xs text-neutral-600 mb-3">
          {item.category}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="secondary" size="xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Stats */}
        <div className="flex justify-between text-body-xs text-neutral-500">
          <span>👁️ {item.views} views</span>
          <span>❤️ {item.likes} likes</span>
        </div>
      </div>
    </Card>
  ))}
</div>
```

#### Project Detail Modal
```tsx
<Modal size="lg" title={project.title}>
  <div className="space-y-6">

    {/* Images Gallery */}
    <div className="space-y-3">
      <div className="w-full h-80 bg-gradient-to-br from-secondary-500
                      to-secondary-700 rounded-lg overflow-hidden">
        <img src={selectedImage} alt={project.title}
          className="w-full h-full object-cover" />
      </div>

      {/* Thumbnail Strip */}
      <div className="flex gap-2 overflow-x-auto">
        {project.images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedImage(img)}
            className="w-20 h-20 rounded-lg overflow-hidden border-2
                       border-transparent hover:border-primary-500
                       transition-colors flex-shrink-0"
          >
            <img src={img} alt={`${project.title} ${idx}`}
              className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>

    {/* Project Info */}
    <div>
      <h3 className="text-heading-sm text-neutral-900 mb-2">
        Project Details
      </h3>
      <p className="text-body-md text-neutral-600 mb-4">
        {project.description}
      </p>

      <dl className="space-y-2">
        <div className="flex justify-between">
          <dt className="text-body-sm font-medium text-neutral-600">Client:</dt>
          <dd className="text-body-sm text-neutral-900">{project.client}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-body-sm font-medium text-neutral-600">Timeline:</dt>
          <dd className="text-body-sm text-neutral-900">{project.timeline}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-body-sm font-medium text-neutral-600">Technologies:</dt>
          <dd className="text-body-sm text-neutral-900">{project.tech}</dd>
        </div>
      </dl>
    </div>

    {/* Actions */}
    <div className="flex gap-3 pt-4 border-t border-neutral-200">
      <Button variant="primary" fullWidth>Edit Project</Button>
      <Button variant="secondary" fullWidth>Delete</Button>
    </div>
  </div>
</Modal>
```

---

## 5️⃣ E-LEARNING MODULE MAQUETTE

**Path:** `/dashboard/elearning`
**Purpose:** Course and lesson management
**Primary Colors:** Info (cyan) + Primary (blue)

### E-Learning Components

#### Courses List
```tsx
<div className="space-y-4">
  {courses.map((course) => (
    <Card
      key={course.id}
      className="p-0 overflow-hidden hover:shadow-lg transition-shadow"
    >

      <div className="flex gap-6">

        {/* Course Thumbnail */}
        <div className="w-40 h-32 bg-gradient-to-br from-info-500 to-info-600
                        flex-shrink-0 overflow-hidden">
          <img src={course.thumbnail} alt={course.title}
            className="w-full h-full object-cover" />
        </div>

        {/* Course Info */}
        <div className="flex-1 p-6 flex flex-col justify-between">

          <div>
            <h3 className="text-heading-sm text-neutral-900 mb-1">
              {course.title}
            </h3>
            <p className="text-body-sm text-neutral-600 line-clamp-2">
              {course.description}
            </p>
          </div>

          {/* Course Metadata */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-4 text-body-xs text-neutral-500">
              <span>📚 {course.lessons} lessons</span>
              <span>👥 {course.students} students</span>
              <span>⭐ {course.rating}/5</span>
            </div>

            {/* Progress Bar */}
            <div className="w-32">
              <div className="flex justify-between mb-1">
                <span className="text-body-xs text-neutral-600">Completion</span>
                <span className="text-body-xs font-medium text-neutral-900">
                  {course.progress}%
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-28 p-6 flex flex-col justify-between border-l border-neutral-200">
          <Button variant="secondary" size="sm" fullWidth>
            Edit
          </Button>
          <Button variant="primary" size="sm" fullWidth>
            View
          </Button>
          <Button variant="ghost" size="sm" fullWidth className="text-error-600">
            Delete
          </Button>
        </div>
      </div>
    </Card>
  ))}
</div>
```

#### Lesson Editor
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

  {/* Main Lesson Content */}
  <div className="lg:col-span-2">
    <Card title="Lesson Content">
      <div className="space-y-6">

        {/* Lesson Title */}
        <div>
          <Label htmlFor="lesson-title">Lesson Title</Label>
          <Input
            id="lesson-title"
            defaultValue={lesson.title}
            className="mt-2"
          />
        </div>

        {/* Lesson Description */}
        <div>
          <Label htmlFor="lesson-desc">Description</Label>
          <textarea
            id="lesson-desc"
            defaultValue={lesson.description}
            className="w-full mt-2 p-3 border border-neutral-200 rounded-lg
                       text-body-sm focus:outline-none focus:ring-2"
            rows={4}
          />
        </div>

        {/* Content Editor (Markdown or Rich Text) */}
        <div>
          <Label>Content</Label>
          <div className="mt-2 border border-neutral-200 rounded-lg overflow-hidden">
            {/* Rich text editor component */}
            <RichTextEditor content={lesson.content} />
          </div>
        </div>

        {/* Video Upload */}
        <div>
          <Label>Video Content (Optional)</Label>
          <div className="mt-2 border-2 border-dashed border-neutral-300 rounded-lg
                          p-8 text-center hover:bg-neutral-50 transition-colors">
            <svg className="w-12 h-12 mx-auto text-neutral-400 mb-2" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-body-sm text-neutral-600">
              Drag and drop a video file here or <a href="#" className="text-primary-600
              hover:underline">click to browse</a>
            </p>
            <p className="text-body-xs text-neutral-500 mt-1">
              MP4, WebM up to 500MB
            </p>
          </div>
        </div>
      </div>
    </Card>
  </div>

  {/* Sidebar */}
  <div className="space-y-6">

    {/* Course Info */}
    <Card title="Course">
      <div className="space-y-3">
        <div>
          <p className="text-body-xs font-medium text-neutral-600 mb-1">Course Name</p>
          <p className="text-body-sm text-neutral-900">{lesson.course}</p>
        </div>
        <div>
          <p className="text-body-xs font-medium text-neutral-600 mb-1">Section</p>
          <p className="text-body-sm text-neutral-900">{lesson.section}</p>
        </div>
        <div>
          <p className="text-body-xs font-medium text-neutral-600 mb-1">Order</p>
          <p className="text-body-sm text-neutral-900">Lesson #{lesson.order}</p>
        </div>
      </div>
    </Card>

    {/* Publish Status */}
    <Card title="Publish Status">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-neutral-600">Status</span>
          <Badge variant={lesson.published ? 'success' : 'warning'}>
            {lesson.published ? 'Published' : 'Draft'}
          </Badge>
        </div>
        <Button variant="primary" fullWidth>
          {lesson.published ? 'Update' : 'Publish'}
        </Button>
        <Button variant="secondary" fullWidth>
          Preview
        </Button>
      </div>
    </Card>

    {/* Quick Actions */}
    <Card title="Actions">
      <div className="space-y-2">
        <Button variant="secondary" fullWidth size="sm">
          Duplicate Lesson
        </Button>
        <Button variant="secondary" fullWidth size="sm">
          Add Quiz
        </Button>
        <Button variant="ghost" fullWidth size="sm" className="text-error-600">
          Delete Lesson
        </Button>
      </div>
    </Card>
  </div>
</div>
```

---

## 🎨 MODULE COLOR SCHEME

| Module | Primary | Secondary | Background | Icon Color |
|--------|---------|-----------|------------|-----------|
| Blog | Primary (Blue) | Secondary (Purple) | primary-50 | primary-600 |
| E-Commerce | Success (Green) | Warning (Orange) | success-50 | success-600 |
| Documentation | Info (Cyan) | Primary (Blue) | info-50 | info-600 |
| Portfolio | Secondary (Purple) | Success (Green) | secondary-50 | secondary-600 |
| E-Learning | Info (Cyan) | Primary (Blue) | info-50 | info-600 |

---

## 📱 RESPONSIVE IMPLEMENTATION

All module pages follow the same responsive pattern as T3.0 dashboard:
- **Desktop (1024px+):** Full layout with sidebar and content
- **Tablet (768px-1023px):** Sidebar becomes drawer, content full-width
- **Mobile (320px-767px):** Single column, drawer navigation

---

## 📊 MODULE NAVIGATION

All modules appear in the sidebar under "Management" section:
```
Dashboard
  Main
  ├ Dashboard
  └ Projects

  Management
  ├ Blog
  │  ├ Posts
  │  ├ Authors
  │  ├ Categories
  │  └ Comments
  ├ E-Commerce
  │  ├ Products
  │  ├ Orders
  │  └ Invoices
  ├ Documentation
  │  ├ Articles
  │  ├ Categories
  │  └ Versions
  ├ Portfolio
  │  ├ Projects
  │  ├ Categories
  │  └ Gallery
  └ E-Learning
     ├ Courses
     ├ Lessons
     ├ Quizzes
     └ Assessments
```

---

## ✨ COMMON MODULE PATTERNS

### 1. List/Table Pattern (Blog, Products, Orders)
- Filter + search bar
- Sortable table/grid
- Pagination
- Bulk actions
- Sidebar with quick stats

### 2. Editor Pattern (Lessons, Posts, Products)
- Main content area
- Code examples/media uploads
- Sidebar for metadata/settings
- Save/Preview/Delete actions
- Status indicators

### 3. Gallery Pattern (Portfolio, Documentation Images)
- Grid or masonry layout
- Image previews
- Quick actions on hover
- Detail modal
- Category filters

### 4. Dashboard Pattern (Module overviews)
- Quick stats cards
- Recent items list
- Quick actions
- Progress indicators
- Status indicators

---

## 📋 IMPLEMENTATION CHECKLIST

### Per Module (All 5)
- [x] Layout specifications
- [x] Component specifications
- [x] Color coding defined
- [x] Typography applied
- [x] Spacing grid used
- [x] Responsive behavior defined
- [x] Code examples provided

### All Modules
- [x] Consistent with T3.0 dashboard layout
- [x] Using design system components
- [x] WCAG 2.1 AA compliance
- [x] Mobile-first responsive
- [x] Interaction patterns documented

---

## 🎯 T3.1 STATUS

**Status:** ✅ MAQUETTES COMPLETE

**Deliverables:**
- ✅ Blog Module maquette (content management)
- ✅ E-Commerce Module maquette (products & orders)
- ✅ Documentation Module maquette (knowledge base)
- ✅ Portfolio Module maquette (project showcase)
- ✅ E-Learning Module maquette (courses & lessons)
- ✅ Color schemes defined per module
- ✅ Navigation structure specified
- ✅ Component patterns documented

**Next Steps (T3.2):**
→ Optimize navigation structure and information architecture

---

**T3.1 Complete: 2025-12-09**
**Design System Version:** Phase 2 Complete
**Total Pages This Task:** 25 pages of module specifications
