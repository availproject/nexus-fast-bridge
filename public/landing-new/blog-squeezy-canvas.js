/**
 * Clean-room port of Stripe homepage "SqueezyImagesCanvas" behavior
 * (canvas card strip + flex columns + springless ease-out lerp).
 */
(function (global) {
  'use strict';

  var CONFIG = {
    smallCardGap: 8,
    largeCardGap: 16,
    smallCardWidth: 8,
    columnOneFlexFraction: -0.06,
    columnOneSqueezedFlexFraction: -0.12,
    columnOneStretchedFlexFraction: 0,
    columnTwoFlexFraction: 0.61,
    columnTwoSqueezedFlexFraction: 0.59,
    columnTwoStretchedFlexFraction: 0.71,
    columnThreeFlexFraction: 0.3,
    columnThreeSqueezedFlexFraction: 0.28,
    columnThreeStretchedFlexFraction: 0.4,
    columnFourFlexFraction: 0.15,
    columnFourSqueezedFlexFraction: 0.13,
    columnFourStretchedFlexFraction: 0.25,
    smallCardHoverOffset: 3,
    borderRadius: 6,
    blurValue: 4,
  };

  var DEFAULT_FLEX = [
    CONFIG.columnOneFlexFraction,
    CONFIG.columnTwoFlexFraction,
    CONFIG.columnThreeFlexFraction,
    CONFIG.columnFourFlexFraction,
  ];

  function clampRadius(radius, min, max) {
    return Math.max(Math.min(radius, max), min);
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function SqueezyImagesCanvas(options) {
    this.canvasElement = options.canvasElement;
    this.items = options.items;
    this.onNextColumnClick = options.onNextColumnClick;
    this.prefersReducedMotion = options.prefersReducedMotion || false;

    this.canvasImages = [];
    this.itemsCollapsedOffsetX = [];
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.cards = [];
    this.totalGap = 3 * CONFIG.smallCardGap + 3 * CONFIG.largeCardGap;
    this.imageWidth = 0;
    this.colOneBaseWidth = 0;
    this.totalMediumCardWidth = 0;
    this.columnIndexOffset = 0;
    this.cardsOffsetX = 0;
    this.animationStartCardsOffsetX = 0;
    this.targetCardsOffsetX = 0;
    this.mediumCardsWidthOffset = 0;
    this.animationStartMediumCardsWidthOffset = 0;
    this.targetMediumCardsWidthOffset = 0;
    this.animationDuration = this.prefersReducedMotion ? 200 : 1000;
    this.animationStartAt = 0;
    this.interactiveCardsFlexFraction = DEFAULT_FLEX.slice();
    this.hoveredCardIndex = -1;
    this.hasInitializedCards = false;
    this.animationRequestId = 0;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    this.ctx = this.canvasElement.getContext('2d');
    this.canvasElement.style.removeProperty('display');

    this._onMouseEnter = this.updateHoverIndex.bind(this);
    this._onMouseMove = this.updateHoverIndex.bind(this);
    this._onMouseLeave = this.resetHoverIndex.bind(this);
    this._onClick = this.onCanvasClick.bind(this);
    this._onVisibility = this.renderGridCards.bind(this);

    this.canvasElement.addEventListener('mouseenter', this._onMouseEnter);
    this.canvasElement.addEventListener('mousemove', this._onMouseMove);
    this.canvasElement.addEventListener('mouseleave', this._onMouseLeave);
    this.canvasElement.addEventListener('click', this._onClick);
    document.addEventListener('visibilitychange', this._onVisibility);

    this.init(this.items);
    this.onCanvasResize();
  }

  SqueezyImagesCanvas.prototype.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  SqueezyImagesCanvas.prototype.getCanvasImages = function (sources) {
    var self = this;
    return sources.map(function (src, index) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        self.renderGridCards();
      };
      img.onerror = function () {
        self.renderGridCards();
      };
      img.src = src;
      return { imageElement: img, loadImage: function () {} };
    });
  };

  SqueezyImagesCanvas.prototype.loadCanvasImages = function () {
    this.renderGridCards();
  };

  SqueezyImagesCanvas.prototype.init = function (items) {
    var self = this;
    this.canvasImages = this.getCanvasImages(items.map(function (item) {
      return item.imgSrc;
    }));
    this.itemsCollapsedOffsetX = items.map(function (item) {
      return item.collapsedOffsetX || 0;
    });

    this.cards = items.map(function (item, index) {
      return {
        itemIndex: index,
        img: self.canvasImages[index].imageElement,
        x: 0,
        collapsedOffsetX: index === 0 ? 0 : self.itemsCollapsedOffsetX[index],
        width: self.getCardWidth(index),
        leftGap: index < 4 ? CONFIG.largeCardGap : CONFIG.smallCardGap,
        blur: index >= 3 ? CONFIG.blurValue : 0,
        columnIndex: index,
      };
    });

    this.renderGridCards();
    this.hasInitializedCards = true;
  };

  SqueezyImagesCanvas.prototype.onCanvasResize = function () {
    var rect = this.canvasElement.getBoundingClientRect();
    var width = rect.width;
    var height = rect.height;

    this.canvasElement.width = width * this.dpr;
    this.canvasElement.height = height * this.dpr;
    this.canvasWidth = width;
    this.canvasHeight = height;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    this.colOneBaseWidth = Math.min(this.canvasHeight * (16 / 9), this.canvasWidth);
    this.totalMediumCardWidth =
      this.canvasWidth - this.colOneBaseWidth - this.totalGap - 3 * CONFIG.smallCardWidth;
    this.imageWidth =
      this.colOneBaseWidth + this.totalMediumCardWidth * CONFIG.columnOneStretchedFlexFraction;

    if (this.animationRequestId) {
      cancelAnimationFrame(this.animationRequestId);
    }

    var self = this;
    this.cards.forEach(function (card) {
      card.width = self.getCardWidth(card.columnIndex);
      card.leftGap = card.columnIndex < 4 ? CONFIG.largeCardGap : CONFIG.smallCardGap;
    });

    if (this.hasInitializedCards) {
      this.resetHoverIndex();
    } else {
      this.renderGridCards();
    }
  };

  SqueezyImagesCanvas.prototype.getCardWidth = function (columnIndex) {
    if (columnIndex < 0 || columnIndex > 3) {
      var hoverExtra =
        this.hoveredCardIndex === columnIndex ? this.targetMediumCardsWidthOffset : 0;
      return CONFIG.smallCardWidth + hoverExtra;
    }

    if (columnIndex === 0) {
      return (
        this.colOneBaseWidth +
        (this.totalMediumCardWidth - this.targetMediumCardsWidthOffset) *
          this.interactiveCardsFlexFraction[0]
      );
    }

    return (
      (this.totalMediumCardWidth - this.targetMediumCardsWidthOffset) *
      this.interactiveCardsFlexFraction[columnIndex]
    );
  };

  SqueezyImagesCanvas.prototype.updateHoverIndex = function (event) {
    var x = event.offsetX;
    var hit = this.cards.find(function (card) {
      return card.x <= x && x <= card.x + card.width;
    });
    var columnIndex = hit ? hit.columnIndex : -1;

    if (columnIndex >= 0 && columnIndex !== this.hoveredCardIndex) {
      this.hoveredCardIndex = columnIndex;
      this.updateCardsFlex();
    }
  };

  SqueezyImagesCanvas.prototype.resetHoverIndex = function () {
    this.hoveredCardIndex = -1;
    this.updateCardsFlex();
  };

  SqueezyImagesCanvas.prototype.onCanvasClick = function () {
    if (this.hoveredCardIndex > 0) {
      this.onNextColumnClick(this.hoveredCardIndex);
    }
  };

  SqueezyImagesCanvas.prototype.updateCardsFlex = function () {
    var hovered = this.hoveredCardIndex;

    if (hovered >= 0 && hovered <= 3 && !this.prefersReducedMotion) {
      this.interactiveCardsFlexFraction = [
        hovered === 0
          ? CONFIG.columnOneStretchedFlexFraction
          : CONFIG.columnOneSqueezedFlexFraction,
        hovered === 1
          ? CONFIG.columnTwoStretchedFlexFraction
          : CONFIG.columnTwoSqueezedFlexFraction,
        hovered === 2
          ? CONFIG.columnThreeStretchedFlexFraction
          : CONFIG.columnThreeSqueezedFlexFraction,
        hovered === 3
          ? CONFIG.columnFourStretchedFlexFraction
          : CONFIG.columnFourSqueezedFlexFraction,
      ];
    } else {
      this.interactiveCardsFlexFraction = DEFAULT_FLEX.slice();
    }

    this.canvasElement.style.cursor = this.hoveredCardIndex >= 0 ? 'pointer' : 'default';
    this.startCarouselAnimation();
  };

  SqueezyImagesCanvas.prototype.setFullHeightRoundedRectClip = function (x, width) {
    var radius = Math.min(width, this.canvasHeight) / 2;
    var r = clampRadius(CONFIG.borderRadius, 0, radius);
    var path = new Path2D();

    path.moveTo(x, r);
    path.lineTo(x, this.canvasHeight - r);
    path.lineTo(x + r, this.canvasHeight);
    path.lineTo(x + width - r, this.canvasHeight);
    path.lineTo(x + width, this.canvasHeight - r);
    path.lineTo(x + width, r);
    path.lineTo(x + width - r, 0);
    path.lineTo(x + r, 0);
    path.arc(x + r, r, r, 0, Math.PI * 2, true);
    path.arc(x + r, this.canvasHeight - r, r, 0, Math.PI * 2, true);
    path.arc(x + width - r, this.canvasHeight - r, r, 0, Math.PI * 2, true);
    path.arc(x + width - r, r, r, 0, Math.PI * 2, true);
    this.ctx.clip(path);
  };

  SqueezyImagesCanvas.prototype.applyTrackFill = function () {
    if (!this.cards.length) return;

    var last = this.cards[this.cards.length - 1];
    var trackEnd = last.x + last.width;
    var remainder = this.canvasWidth - trackEnd;

    this.cards.forEach(function (card) {
      card.renderWidth = card.width;
    });

    if (remainder <= 0.5) return;

    var rightmost = this.cards[0];
    var i;

    for (i = 1; i < this.cards.length; i++) {
      var card = this.cards[i];
      if (card.columnIndex < 0 || card.columnIndex > 3) continue;
      if (card.x + card.width >= rightmost.x + rightmost.width) {
        rightmost = card;
      }
    }

    if (rightmost.columnIndex >= 0 && rightmost.columnIndex <= 3) {
      rightmost.renderWidth = rightmost.width + remainder;
    }
  };

  SqueezyImagesCanvas.prototype.renderCard = function (card) {
    var img = card.img;
    if (!img.complete || !img.naturalWidth) return;

    var width = card.renderWidth != null ? card.renderWidth : card.width;

    this.ctx.save();
    this.setFullHeightRoundedRectClip(card.x, width);

    var imageAspect = img.width / img.height;
    var drawW;
    var drawH;
    var drawX;
    var drawY;

    if (imageAspect > this.imageWidth / this.canvasHeight) {
      drawH = this.canvasHeight;
      drawW = this.canvasHeight * imageAspect;
      drawX = (this.imageWidth - drawW) / 2;
      drawY = 0;
    } else {
      drawW = this.imageWidth;
      drawH = this.imageWidth / imageAspect;
      drawX = 0;
      drawY = (this.canvasHeight - drawH) / 2;
    }

    drawX += card.x + width / 2 - drawW / 2 - card.collapsedOffsetX;
    this.ctx.drawImage(img, drawX, drawY, drawW, drawH);
    this.ctx.restore();
    this.ctx.save();
  };

  SqueezyImagesCanvas.prototype.renderGridCards = function () {
    var self = this;

    this.cards.forEach(function (card, index) {
      if (index === 0) {
        card.x = self.cardsOffsetX;
      } else {
        var prev = self.cards[index - 1];
        card.x = prev.x + prev.width + card.leftGap;
      }
    });

    this.applyTrackFill();

    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.cards.forEach(function (card) {
      var width = card.renderWidth != null ? card.renderWidth : card.width;
      if (width <= 0 || card.x + width < 0 || card.x > self.canvasWidth) return;
      self.renderCard(card);
    });
  };

  SqueezyImagesCanvas.prototype.prepareCardAnimationTargets = function () {
    var self = this;
    this.cards.forEach(function (card) {
      var columnIndex = card.columnIndex;
      card.animationStartCollapsedOffsetX = card.collapsedOffsetX;
      card.animationStartWidth = card.width;
      card.animationStartLeftGap = card.leftGap;
      card.targetCollapsedOffsetX = columnIndex === 0 ? 0 : self.itemsCollapsedOffsetX[card.itemIndex];
      card.targetWidth = self.getCardWidth(columnIndex);
      card.targetLeftGap = columnIndex < 4 ? CONFIG.largeCardGap : CONFIG.smallCardGap;
      card.targetBlur = columnIndex >= 3 ? CONFIG.blurValue : 0;
    });
  };

  SqueezyImagesCanvas.prototype.startCarouselAnimation = function (steps) {
    steps = steps || 0;

    this.animationStartCardsOffsetX =
      this.cardsOffsetX - steps * (CONFIG.smallCardWidth + CONFIG.largeCardGap);
    this.targetCardsOffsetX = this.columnIndexOffset * (CONFIG.smallCardWidth + CONFIG.largeCardGap);
    this.animationStartMediumCardsWidthOffset = this.mediumCardsWidthOffset;
    this.targetMediumCardsWidthOffset =
      !this.prefersReducedMotion && this.hoveredCardIndex > 3
        ? CONFIG.smallCardHoverOffset
        : 0;

    this.prepareCardAnimationTargets();
    this.animationStartAt = performance.now();

    if (this.animationRequestId) {
      cancelAnimationFrame(this.animationRequestId);
    }

    var self = this;
    this.animationRequestId = requestAnimationFrame(function frame(now) {
      self.animate(now, frame);
    });
  };

  SqueezyImagesCanvas.prototype.animate = function (now, frame) {
    var progress = Math.min((now - this.animationStartAt) / this.animationDuration, 1);
    var eased = easeOut(progress);

    this.cardsOffsetX = this.lerp(this.animationStartCardsOffsetX, this.targetCardsOffsetX, eased);
    this.mediumCardsWidthOffset = this.lerp(
      this.animationStartMediumCardsWidthOffset,
      this.targetMediumCardsWidthOffset,
      eased
    );

    var self = this;
    this.cards.forEach(function (card) {
      card.collapsedOffsetX = self.lerp(
        card.animationStartCollapsedOffsetX,
        card.targetCollapsedOffsetX,
        eased
      );
      card.width = self.lerp(card.animationStartWidth, card.targetWidth, eased);
      card.leftGap = self.lerp(card.animationStartLeftGap, card.targetLeftGap, eased);
    });

    this.renderGridCards();

    if (progress < 1) {
      this.animationRequestId = requestAnimationFrame(frame);
    } else {
      this.onAnimationComplete();
    }
  };

  SqueezyImagesCanvas.prototype.onAnimationComplete = function () {
    var leadIndex = this.cards.findIndex(function (card) {
      return card.columnIndex === 0;
    });

    if (leadIndex > -1) {
      this.cards = this.cards.slice(leadIndex, leadIndex + 7);
    }

    this.columnIndexOffset = 0;
    this.cardsOffsetX = 0;
    this.renderGridCards();
  };

  SqueezyImagesCanvas.prototype.gotoPrev = function (steps) {
    var count = this.canvasImages.length;

    for (var i = 0; i < steps; i++) {
      var itemIndex = (this.cards[0].itemIndex - 1 + count) % count;
      this.cards.unshift({
        itemIndex: itemIndex,
        img: this.canvasImages[itemIndex].imageElement,
        x: 0,
        collapsedOffsetX: 0,
        width: CONFIG.smallCardWidth,
        leftGap: CONFIG.largeCardGap,
        columnIndex: 0,
      });
    }

    this.cards.forEach(function (card, index) {
      card.columnIndex = index + this.columnIndexOffset;
    }, this);

    this.startCarouselAnimation(steps);
  };

  SqueezyImagesCanvas.prototype.gotoNext = function (steps) {
    var count = this.canvasImages.length;

    for (var i = 0; i < steps; i++) {
      var last = this.cards[this.cards.length - 1];
      var itemIndex = (last.itemIndex + 1) % count;
      this.cards.push({
        itemIndex: itemIndex,
        img: this.canvasImages[itemIndex].imageElement,
        x: 0,
        collapsedOffsetX: this.itemsCollapsedOffsetX[itemIndex],
        width: CONFIG.smallCardWidth,
        leftGap: CONFIG.smallCardGap,
        columnIndex: 0,
      });
    }

    this.columnIndexOffset -= steps;

    this.cards.forEach(function (card, index) {
      card.columnIndex = index + this.columnIndexOffset;
    }, this);

    this.startCarouselAnimation();
  };

  SqueezyImagesCanvas.prototype.dispose = function () {
    if (this.animationRequestId) {
      cancelAnimationFrame(this.animationRequestId);
    }

    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.canvasElement.width = 0;
    this.canvasElement.height = 0;

    this.canvasImages.forEach(function (entry) {
      entry.imageElement.onload = null;
      entry.imageElement.onerror = null;
      entry.imageElement.src = '';
    });

    this.canvasElement.removeEventListener('mouseenter', this._onMouseEnter);
    this.canvasElement.removeEventListener('mousemove', this._onMouseMove);
    this.canvasElement.removeEventListener('mouseleave', this._onMouseLeave);
    this.canvasElement.removeEventListener('click', this._onClick);
    document.removeEventListener('visibilitychange', this._onVisibility);
  };

  global.SqueezyImagesCanvas = SqueezyImagesCanvas;
})(typeof window !== 'undefined' ? window : globalThis);
